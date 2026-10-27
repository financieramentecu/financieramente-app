import {
	AnnualPaymentStatus,
	Prisma,
	type Business,
	type ProductPercentageCommission,
} from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBusiness } from '@/features/negocios/actions/create-business'
import { getPpcForNewBusinesses } from '@/features/negocios/services/product-configuration.service'
import { linkLeadToBusinessTx } from '@/features/leads/services/lead-conversion.service'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn(), findMany: vi.fn() },
		buyPeriodicity: { findUnique: vi.fn() },
		product: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
}))

vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	getPpcForNewBusinesses: vi.fn(),
}))

vi.mock('@/features/leads/services/lead-conversion.service', () => ({
	linkLeadToBusinessTx: vi.fn(),
}))

vi.mock('@/lib/auth/require-write-access', () => ({
	requireWriteAccess: vi.fn(),
}))

vi.mock('next/headers', () => ({
	headers: vi.fn(async () => new Headers()),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: {
		BUSINESS_POLICYHOLDER_LINKED: 'BUSINESS_POLICYHOLDER_LINKED',
		BUSINESS_POLICYHOLDER_UNLINKED: 'BUSINESS_POLICYHOLDER_UNLINKED',
	},
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test'),
	logAuditEvent: vi.fn(),
}))

import { requireWriteAccess } from '@/lib/auth/require-write-access'

const basePayload = {
	value: 1_000_000,
	idUser: 1,
	idClient: 1,
	idProduct: 1,
	idCurrency: 1,
	idClientOrigin: 1,
}

function mockCreatedBusiness(overrides: Partial<Business> = {}): Business {
	const now = new Date()
	return {
		idBusiness: 42,
		contract: null,
		term: 3,
		value: new Prisma.Decimal(1_000_000),
		observations: null,
		idBuyPeriodicity: 1,
		idUser: 1,
		idClient: 1,
		idProductPercentageCommission: 99,
		idCurrency: 1,
		status: 'VENTA_EFECTUADA',
		createdAt: now,
		updatedAt: now,
		idClientOrigin: 1,
		dateIssued: null,
		dateAnchored: null,
		numAportes: null,
		novedadStatus: null,
		novedadMarkedAt: null,
		novedadResolvedAt: null,
		isActive: true,
		clientIsPolicyholder: true,
		idPolicyholder: null,
		...overrides,
	}
}

describe('createBusiness', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireWriteAccess).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', role: UserRole.ADMIN } },
		} as never)
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: {
				idProductPercentageCommission: 99,
			} as ProductPercentageCommission,
		})
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idLevel: 5,
		} as Awaited<ReturnType<typeof prisma.user.findUnique>>)
		vi.mocked(prisma.product.findUnique).mockResolvedValue({
			name: 'Producto Test',
			company: { name: 'Compañia Test' },
		} as unknown as Awaited<ReturnType<typeof prisma.product.findUnique>>)
	})

	it('rejects SKANDIA MFUND when the periodicity is not Aportes Ocasionales', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		vi.mocked(prisma.product.findUnique).mockResolvedValue({
			name: 'MFUND',
			company: { name: 'SKANDIA' },
		} as unknown as Awaited<ReturnType<typeof prisma.product.findUnique>>)

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
			term: 0,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toMatch(/Aportes Ocasionales/)
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})

	it('returns rejected ApiResponse for CONSULTOR (read-only role)', async () => {
		vi.mocked(requireWriteAccess).mockResolvedValueOnce({
			ok: false,
			response: { status: 403 },
		} as never)

		const result = await createBusiness({ ...basePayload, idBuyPeriodicity: 1, term: 3 })

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})

	it('does NOT create payment rows when business is VENTA_EFECTUADA', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Anual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({ term: 3, idBusiness: 10, status: 'VENTA_EFECTUADA' })
		const annualCreateMany = vi.fn().mockResolvedValue({ count: 0 })
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: vi.fn().mockResolvedValue(created) },
				payment: { createMany: annualCreateMany },
			} as never)
		})

		const result = await createBusiness({ ...basePayload, idBuyPeriodicity: 1, term: 3 })

		expect(result.data?.idBusiness).toBe(10)
		expect(annualCreateMany).not.toHaveBeenCalled()
	})

	it('creates SIN_FONDEAR payment rows with expectedDate and null dateAnchored when business is created with contract', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Anual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({
			term: 3,
			idBusiness: 10,
			status: 'EMITIDO',
			dateIssued: new Date('2024-01-01'),
			contract: 'CONTRACT-123',
		})
		const annualCreateMany = vi.fn().mockResolvedValue({ count: 3 })
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: vi.fn().mockResolvedValue(created) },
				payment: { createMany: annualCreateMany },
			} as never)
		})

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 1,
			term: 3,
			contract: 'CONTRACT-123',
		})

		expect(result.data?.idBusiness).toBe(10)
		expect(annualCreateMany).toHaveBeenCalledTimes(1)
		const payload = annualCreateMany.mock.calls[0][0] as { data: Array<Record<string, unknown>> }
		expect(payload.data).toHaveLength(3)
		expect(payload.data[0].status).toBe(AnnualPaymentStatus.SIN_FONDEAR)
		expect(payload.data[0].expectedDate).toBeDefined()
		expect(payload.data[0].dateAnchored).toBeNull()
	})

	it('creates SIN_FONDEAR payment rows when business is created with contract (EMITIDO)', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({
			term: 12,
			idBusiness: 11,
			numAportes: 144,
			status: 'EMITIDO',
			dateIssued: new Date('2024-01-01'),
			contract: 'CONTRACT-001',
		})
		const annualCreateMany = vi.fn().mockResolvedValue({ count: 144 })
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: vi.fn().mockResolvedValue(created) },
				payment: { createMany: annualCreateMany },
			} as never)
		})

		await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
			term: 12,
			contract: 'CONTRACT-001',
		})

		expect(annualCreateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({ installmentIndex: 1, status: AnnualPaymentStatus.SIN_FONDEAR }),
				]),
			})
		)
	})

	it('creates business with 0 aportes when Anual and term is missing', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Anual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({ idBusiness: 11, numAportes: 0 })
		const annualCreateMany = vi.fn()
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: vi.fn().mockResolvedValue(created) },
				payment: { createMany: annualCreateMany },
			} as never)
		})

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 1,
		})

		// Action is lenient — form layer validates "Anual requires term > 0"
		expect(result.data).not.toBeNull()
		expect(annualCreateMany).not.toHaveBeenCalled()
	})

	it('returns validation error when term exceeds max', async () => {
		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 1,
			term: 26,
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.$transaction).not.toHaveBeenCalled()
	})

	it('uses VENTA_EFECTUADA and null contract in business.create when contract is omitted', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Anual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({
			term: 3,
			idBusiness: 10,
			contract: null,
			status: 'VENTA_EFECTUADA',
		})
		const annualCreateMany = vi.fn().mockResolvedValue({ count: 3 })
		const businessCreate = vi.fn().mockResolvedValue(created)
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: businessCreate },
				payment: { createMany: annualCreateMany },
			} as never)
		})

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 1,
			term: 3,
		})

		expect(result.data?.status).toBe('VENTA_EFECTUADA')
		expect(result.data?.contract).toBeNull()
		expect(businessCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				status: 'VENTA_EFECTUADA',
				contract: null,
				dateIssued: null,
			}),
		})
	})

	it('sets dateIssued and calculates expectedDates when contract is provided on create', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({
			idBusiness: 20,
			contract: 'PN9999999',
			status: 'EMITIDO',
		})
		const businessCreate = vi.fn().mockResolvedValue(created)
		const paymentCreateMany = vi.fn().mockResolvedValue({ count: 12 })
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: businessCreate },
				payment: { createMany: paymentCreateMany },
			} as never)
		})

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
			contract: 'PN9999999',
			term: 3,
		})

		expect(result.data?.status).toBe('EMITIDO')
		expect(businessCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				status: 'EMITIDO',
				contract: 'PN9999999',
				dateIssued: expect.any(Date),
			}),
		})
		expect(paymentCreateMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					installmentIndex: 1,
					expectedDate: expect.any(Date),
				}),
			]),
		})
	})

	it('uses the commission id returned by lookup action (specific or fallback)', async () => {
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: {
				idProductPercentageCommission: 123,
			} as ProductPercentageCommission,
		})
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const businessCreate = vi.fn().mockResolvedValue(mockCreatedBusiness())
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: businessCreate },
				payment: { createMany: vi.fn() },
			} as never)
		})

		await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
		})

		expect(businessCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				idProductPercentageCommission: 123,
			}),
		})
	})

	describe('optional idLead (leads-crm-sync conversion)', () => {
		it('REGRESSION: createBusiness() without idLead behaves exactly as before — never calls linkLeadToBusinessTx', async () => {
			vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
				name: 'Anual',
			} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
			const created = mockCreatedBusiness({ idBusiness: 10, status: 'VENTA_EFECTUADA' })
			vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
				return callback({
					business: { create: vi.fn().mockResolvedValue(created) },
					payment: { createMany: vi.fn() },
				} as never)
			})

			const result = await createBusiness({ ...basePayload, idBuyPeriodicity: 1, term: 3 })

			expect(result.data?.idBusiness).toBe(10)
			expect(linkLeadToBusinessTx).not.toHaveBeenCalled()
		})

		it('sets Lead.idBusiness in-transaction when idLead is provided', async () => {
			vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
				name: 'Anual',
			} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
			const created = mockCreatedBusiness({ idBusiness: 77, status: 'VENTA_EFECTUADA' })
			const businessCreate = vi.fn().mockResolvedValue(created)
			let capturedTx: unknown
			vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
				capturedTx = {
					business: { create: businessCreate },
					payment: { createMany: vi.fn() },
				}
				return callback(capturedTx as never)
			})
			vi.mocked(linkLeadToBusinessTx).mockResolvedValue(undefined)

			const result = await createBusiness({
				...basePayload,
				idBuyPeriodicity: 1,
				term: 3,
				idLead: 5,
			})

			expect(result.data?.idBusiness).toBe(77)
			expect(linkLeadToBusinessTx).toHaveBeenCalledWith(capturedTx, 5, 77)
		})

		it('rolls back the whole transaction (no Business created) when the lead is already converted', async () => {
			vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
				name: 'Anual',
			} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
			const created = mockCreatedBusiness({ idBusiness: 88, status: 'VENTA_EFECTUADA' })
			const businessCreate = vi.fn().mockResolvedValue(created)
			vi.mocked(linkLeadToBusinessTx).mockRejectedValue(
				new Error('El lead ya fue convertido a negocio o no está disponible para conversión')
			)
			vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
				// A real Prisma $transaction propagates the callback's rejection —
				// no Business row is committed when the callback throws.
				return callback({
					business: { create: businessCreate },
					payment: { createMany: vi.fn() },
				} as never)
			})

			const result = await createBusiness({
				...basePayload,
				idBuyPeriodicity: 1,
				term: 3,
				idLead: 5,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBeTruthy()
		})
	})

	describe('owner resolution and PARTNER_EXTERNAL pricing (COM-41 NEG-02, PA-04)', () => {
		const PARTNER_SESSION_ID = 77

		function setSession(id: number, role: UserRole | null) {
			vi.mocked(requireWriteAccess).mockResolvedValue({
				ok: true,
				session: { user: { id: String(id), role } },
			} as never)
		}

		function mockTransaction() {
			const businessCreate = vi.fn().mockResolvedValue(mockCreatedBusiness())
			vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
				callback({
					business: { create: businessCreate },
					payment: { createMany: vi.fn() },
				} as never)
			)
			return businessCreate
		}

		function mockOwnerLevel(code: string, idLevel = 9) {
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				idLevel,
				level: { code },
			} as never)
		}

		it('PARTNER session ignores a client-sent idUser and creates for the session user', async () => {
			setSession(PARTNER_SESSION_ID, UserRole.PARTNER)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			const businessCreate = mockTransaction()

			const result = await createBusiness({ ...basePayload, idUser: 5 })

			expect(result.data).not.toBeNull()
			expect(businessCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({ idUser: PARTNER_SESSION_ID }),
			})
			expect(prisma.user.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({ where: { idUser: PARTNER_SESSION_ID } })
			)
		})

		it('PARTNER session resolves the PPC with the PARTNER_EXTERNAL level of the partner', async () => {
			setSession(PARTNER_SESSION_ID, UserRole.PARTNER)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			mockTransaction()

			await createBusiness({ ...basePayload, idUser: 5, idProduct: 3 })

			expect(getPpcForNewBusinesses).toHaveBeenCalledWith({
				idProduct: 3,
				idLevel: 40,
			})
		})

		it.each([
			UserRole.ADMIN,
			UserRole.ANALISTA_SOPORTE,
			UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		])('%s may create on behalf of a partner (owner = requested partner)', async (role) => {
			setSession(1, role)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			const businessCreate = mockTransaction()

			const result = await createBusiness({ ...basePayload, idUser: PARTNER_SESSION_ID })

			expect(result.data).not.toBeNull()
			expect(businessCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({ idUser: PARTNER_SESSION_ID }),
			})
			expect(getPpcForNewBusinesses).toHaveBeenCalledWith(
				expect.objectContaining({ idLevel: 40 })
			)
		})

		it('bypass role keeps creating on behalf of an agent with the agent level', async () => {
			setSession(1, UserRole.ADMIN)
			mockOwnerLevel('LEVEL_3', 7)
			const businessCreate = mockTransaction()

			await createBusiness({ ...basePayload, idUser: 12 })

			expect(getPpcForNewBusinesses).toHaveBeenCalledWith(
				expect.objectContaining({ idLevel: 7 })
			)
			expect(businessCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({ idUser: 12 }),
			})
		})

		it('AGENTE may create for self', async () => {
			setSession(12, UserRole.AGENTE)
			vi.mocked(prisma.user.findMany).mockResolvedValue([
				{ idUser: 12, idUserLeader: null },
			] as never)
			mockOwnerLevel('LEVEL_3', 7)
			const businessCreate = mockTransaction()

			const result = await createBusiness({ ...basePayload, idUser: 12 })

			expect(result.data).not.toBeNull()
			expect(businessCreate).toHaveBeenCalled()
		})

		it('AGENTE may create for a subordinate partner (hierarchy scope)', async () => {
			setSession(12, UserRole.AGENTE)
			vi.mocked(prisma.user.findMany).mockResolvedValue([
				{ idUser: 12, idUserLeader: null },
				{ idUser: 77, idUserLeader: 12 },
			] as never)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			const businessCreate = mockTransaction()

			const result = await createBusiness({ ...basePayload, idUser: 77 })

			expect(result.data).not.toBeNull()
			expect(businessCreate).toHaveBeenCalledWith({
				data: expect.objectContaining({ idUser: 77 }),
			})
		})

		it('AGENTE is denied for an owner outside self and subordinates', async () => {
			setSession(12, UserRole.AGENTE)
			vi.mocked(prisma.user.findMany).mockResolvedValue([
				{ idUser: 12, idUserLeader: null },
				{ idUser: 99, idUserLeader: null },
			] as never)

			const result = await createBusiness({ ...basePayload, idUser: 99 })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Sin permisos')
			expect(getPpcForNewBusinesses).not.toHaveBeenCalled()
			expect(prisma.$transaction).not.toHaveBeenCalled()
		})

		it.each([UserRole.DEFAULT, null])(
			'denies role %s without touching the database',
			async (role) => {
				setSession(3, role as UserRole | null)

				const result = await createBusiness({ ...basePayload })

				expect(result.data).toBeNull()
				expect('error' in result && result.error).toBe('Sin permisos')
				expect(prisma.user.findUnique).not.toHaveBeenCalled()
				expect(prisma.$transaction).not.toHaveBeenCalled()
			}
		)

		it('persists nothing and answers in Spanish when the product has no PARTNER_EXTERNAL configuration (thrown by lookup)', async () => {
			setSession(PARTNER_SESSION_ID, UserRole.PARTNER)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			vi.mocked(getPpcForNewBusinesses).mockRejectedValue(
				new Error(
					'No existe configuración de distribución para el producto y nivel seleccionados.'
				)
			)

			const result = await createBusiness({ ...basePayload })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Este producto no está disponible para partners: no tiene configuración de comisión externa.'
			)
			expect(prisma.$transaction).not.toHaveBeenCalled()
		})

		it('persists nothing when the PARTNER_EXTERNAL configuration has no active PPC for new businesses', async () => {
			setSession(PARTNER_SESSION_ID, UserRole.PARTNER)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			vi.mocked(getPpcForNewBusinesses).mockResolvedValue({ configExists: true, ppc: null })

			const result = await createBusiness({ ...basePayload })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toMatch(/partners/)
			expect(prisma.$transaction).not.toHaveBeenCalled()
		})

		it('admin on behalf of a partner also fails with the partner message when the product has no partner PPC', async () => {
			setSession(1, UserRole.ADMIN)
			mockOwnerLevel('PARTNER_EXTERNAL', 40)
			vi.mocked(getPpcForNewBusinesses).mockRejectedValue(
				new Error('No existe configuración')
			)

			const result = await createBusiness({ ...basePayload, idUser: PARTNER_SESSION_ID })

			expect('error' in result && result.error).toMatch(/partners/)
			expect(prisma.$transaction).not.toHaveBeenCalled()
		})

		it('keeps the generic message for non-partner owners without configuration', async () => {
			setSession(1, UserRole.ADMIN)
			mockOwnerLevel('LEVEL_3', 7)
			vi.mocked(getPpcForNewBusinesses).mockRejectedValue(
				new Error(
					'No hay configuración de comisión para esta combinación de producto y categoría.'
				)
			)

			const result = await createBusiness({ ...basePayload })

			expect('error' in result && result.error).toBe(
				'No hay configuración de comisión para esta combinación de producto y categoría.'
			)
		})
	})
})
