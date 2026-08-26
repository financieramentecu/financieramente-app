import {
	AnnualPaymentStatus,
	Prisma,
	type Business,
	type ProductPercentageCommission,
} from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBusiness } from '@/features/negocios/actions/create-business'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
import { linkLeadToBusinessTx } from '@/features/leads/services/lead-conversion.service'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: vi.fn() },
		buyPeriodicity: { findUnique: vi.fn() },
		product: { findUnique: vi.fn() },
		$transaction: vi.fn(),
	},
}))

vi.mock('@/features/negocios/actions/find-product-percentage-commission', () => ({
	findProductPercentageCommission: vi.fn(),
}))

vi.mock('@/features/leads/services/lead-conversion.service', () => ({
	linkLeadToBusinessTx: vi.fn(),
}))

vi.mock('@/lib/auth/require-write-access', () => ({
	requireWriteAccess: vi.fn(),
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
		...overrides,
	}
}

describe('createBusiness', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireWriteAccess).mockResolvedValue({
			ok: true,
			session: { user: {} },
		} as never)
		vi.mocked(findProductPercentageCommission).mockResolvedValue({
			data: {
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
		vi.mocked(findProductPercentageCommission).mockResolvedValue({
			data: {
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
})
