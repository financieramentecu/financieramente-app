/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NEG-03 / PL-03 [PO]: PUT /api/negocios/[id] on businesses whose PPC belongs
 * to a PARTNER_EXTERNAL configuration (no category lines, no distribution).
 *
 * - Origin change keeps the "only EMITIDO" rule, skips the category-line
 *   validation and the commission recalculation, persists the origin only.
 * - Product edits in VENTA_EFECTUADA re-resolve the (empty) partner PPC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { recalcularComisionesPorCambioOrigen } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { validateProductConfigurationExists } from '@/features/negocios/services/product-configuration.service'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	mockPrismaBusinessEmitido,
	mockPrismaBusinessVentaEfectuada,
} from '@/features/negocios/__tests__/fixtures/mock-prisma-business'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockTxUpdate, mockFindFirst } = vi.hoisted(() => ({
	mockTxUpdate: vi.fn(),
	mockFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			findFirst: (...args: unknown[]) => mockFindFirst(...args),
		},
		user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
		buyPeriodicity: { findUnique: vi.fn() },
		product: { findUnique: vi.fn() },
		payment: { findMany: vi.fn(), update: vi.fn() },
		$transaction: vi.fn().mockImplementation(async (cb: any) =>
			cb({
				business: { update: mockTxUpdate },
				payment: {
					findMany: vi.fn().mockResolvedValue([]),
					deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
					createMany: vi.fn().mockResolvedValue({ count: 0 }),
				},
			})
		),
	},
}))
vi.mock('@/features/pre-liquidacion/services/pre-liquidacion.service', () => ({
	recalcularComisionesPorCambioOrigen: vi.fn(),
	sincronizarYCalcularRegistroRezagado: vi.fn(),
}))
vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	validateProductConfigurationExists: vi.fn(),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock(
	'@/features/negocios/actions/find-product-percentage-commission',
	() => ({
		findProductPercentageCommission: vi.fn(),
	})
)
vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn().mockResolvedValue(undefined),
	AuditAction: { BUSINESS_UPDATED: 'BUSINESS_UPDATED' },
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
	getUserAgent: vi.fn().mockReturnValue('test-agent'),
}))
vi.mock('@/features/negocios/mappers/business-entity.mapper', () => ({
	prismaBusinessToEntity: vi.fn().mockReturnValue({ id: 10 }),
}))

const PARTNER = {
	idUser: 77,
	idRole: 9,
	name: 'Pat',
	role: { code: 'PARTNER' },
}
const ADMIN = { idUser: 1, idRole: 1, name: 'Admin', role: { code: 'ADMIN' } }
const AGENT = { idUser: 5, idRole: 2, name: 'Ana', role: { code: 'AGENTE' } }

function partnerBusiness(
	base: any,
	levelCode = 'PARTNER_EXTERNAL',
	idLevel = 40
) {
	return {
		...base,
		idBusiness: 10,
		idUser: PARTNER.idUser,
		productPercentageCommission: {
			...base.productPercentageCommission,
			productConfiguration: {
				...base.productPercentageCommission.productConfiguration,
				idLevel,
				level: { code: levelCode },
			},
		},
	}
}

function put(body: Record<string, unknown>) {
	return PUT(
		new Request('http://localhost:3000/api/negocios/10', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id: '10' }) } as any
	)
}

function setup(user: any, business: any) {
	vi.mocked(auth as any).mockResolvedValue({ user: { email: 'u@test.com' } })
	vi.mocked(getCurrentUserByEmail as any).mockResolvedValue(user)
	mockFindFirst.mockResolvedValue(business)
	mockTxUpdate.mockResolvedValue({ idBusiness: 10, status: business.status })
}

describe('PUT /api/negocios/[id] on a PARTNER_EXTERNAL business', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(findProductPercentageCommission).mockResolvedValue({
			data: { idProductPercentageCommission: 555 },
		} as never)
		vi.mocked(prisma.product.findUnique).mockResolvedValue({
			idProduct: 9,
			name: 'Partner product',
			company: { name: 'Partner company' },
		} as never)
		vi.mocked(validateProductConfigurationExists).mockResolvedValue({
			valid: false,
			reason: 'La configuración no tiene reglas de distribución configuradas.',
		})
	})

	describe('origin change', () => {
		it('PARTNER on EMITIDO: persists only the new origin, skips category validation and recalculation, audits', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessEmitido))

			const res = await put({ idClientOrigin: 2 })

			expect(res.status).toBe(200)
			expect(validateProductConfigurationExists).not.toHaveBeenCalled()
			expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
			expect(mockTxUpdate).toHaveBeenCalledTimes(1)
			const data = mockTxUpdate.mock.calls[0][0].data
			expect(data.clientOrigin).toEqual({ connect: { idClientOrigin: 2 } })
			expect(data.productPercentageCommission).toEqual({
				connect: {
					idProductPercentageCommission:
						mockPrismaBusinessEmitido.idProductPercentageCommission,
				},
			})
			expect(logAuditEvent).toHaveBeenCalledTimes(1)
			expect(
				JSON.parse((vi.mocked(logAuditEvent).mock.calls[0][0] as any).details)
			).toMatchObject({ businessId: 10, idClientOrigin: 2 })
		})

		it('ADMIN changing the origin of a partner business follows the same rule (decided by the PPC level)', async () => {
			setup(ADMIN, partnerBusiness(mockPrismaBusinessEmitido))

			const res = await put({ idClientOrigin: 3 })

			expect(res.status).toBe(200)
			expect(validateProductConfigurationExists).not.toHaveBeenCalled()
			expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
		})

		it('PARTNER on VENTA_EFECTUADA: still rejected, nothing persisted (only EMITIDO)', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ idClientOrigin: 2 })
			const body = await res.json()

			expect(res.status).toBe(400)
			expect(body.error).toContain('EMITIDO')
			expect(mockTxUpdate).not.toHaveBeenCalled()
			expect(logAuditEvent).not.toHaveBeenCalled()
		})

		it('regression: a non-partner level business keeps validation and recalculation', async () => {
			vi.mocked(validateProductConfigurationExists).mockResolvedValue({
				valid: true,
			})
			setup(ADMIN, partnerBusiness(mockPrismaBusinessEmitido, 'LEVEL_3', 3))

			const res = await put({ idClientOrigin: 2 })

			expect(res.status).toBe(200)
			expect(validateProductConfigurationExists).toHaveBeenCalledWith(
				3,
				expect.any(Number)
			)
			expect(recalcularComisionesPorCambioOrigen).toHaveBeenCalledTimes(1)
		})

		it('regression: a non-partner level business without the level relation still validates', async () => {
			setup(ADMIN, { ...mockPrismaBusinessEmitido, idBusiness: 10 })

			const res = await put({ idClientOrigin: 2 })

			expect(res.status).toBe(400)
			expect(validateProductConfigurationExists).toHaveBeenCalledTimes(1)
		})
	})

	describe('partner editing in VENTA_EFECTUADA', () => {
		it('product change re-resolves the PARTNER_EXTERNAL PPC with the partner level and skips recalculation', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ idProduct: 9 })

			expect(res.status).toBe(200)
			expect(findProductPercentageCommission).toHaveBeenCalledWith({
				idProduct: 9,
				idLevel: 40,
			})
			const data = mockTxUpdate.mock.calls[0][0].data
			expect(data.productPercentageCommission).toEqual({
				connect: { idProductPercentageCommission: 555 },
			})
			expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
			expect(validateProductConfigurationExists).not.toHaveBeenCalled()
		})

		it('product without a partner configuration answers 400 in Spanish and persists nothing', async () => {
			vi.mocked(findProductPercentageCommission).mockResolvedValue({
				data: null,
				error: 'No existe configuración',
			})
			setup(PARTNER, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ idProduct: 9 })
			const body = await res.json()

			expect(res.status).toBe(400)
			expect(body.error).toMatch(/partners/)
			expect(mockTxUpdate).not.toHaveBeenCalled()
		})

		it('non-product edits (value, term) keep the PPC and never recalculate', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ value: 2_000_000, term: 3 })

			expect(res.status).toBe(200)
			expect(findProductPercentageCommission).not.toHaveBeenCalled()
			expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
		})

		it('PARTNER cannot reassign the business owner', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ idUser: 999 })

			expect(res.status).toBe(403)
			expect(mockTxUpdate).not.toHaveBeenCalled()
			expect(prisma.user.findUnique).not.toHaveBeenCalled()
		})

		it('ADMIN reassigning a partner business to an agent resolves the agent level and recalculates', async () => {
			vi.mocked(prisma.user.findUnique as any).mockResolvedValue({
				idLevel: 3,
				level: { code: 'LEVEL_3' },
			})
			setup(ADMIN, partnerBusiness(mockPrismaBusinessVentaEfectuada))

			const res = await put({ idUser: 5 })

			expect(res.status).toBe(200)
			expect(findProductPercentageCommission).toHaveBeenCalledWith(
				expect.objectContaining({ idLevel: 3 })
			)
			expect(recalcularComisionesPorCambioOrigen).toHaveBeenCalledTimes(1)
		})

		it('ADMIN reassigning an agent business to a partner skips recalculation (no distribution)', async () => {
			vi.mocked(prisma.user.findUnique as any).mockResolvedValue({
				idLevel: 40,
				level: { code: 'PARTNER_EXTERNAL' },
			})
			setup(ADMIN, {
				...mockPrismaBusinessVentaEfectuada,
				idBusiness: 10,
			})

			const res = await put({ idUser: PARTNER.idUser })

			expect(res.status).toBe(200)
			expect(recalcularComisionesPorCambioOrigen).not.toHaveBeenCalled()
		})
	})

	describe('partner editing an EMITIDO business', () => {
		it('key fields are rejected exactly like for an agent', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessEmitido))

			const res = await put({ idProduct: 9 })

			expect(res.status).toBe(403)
			expect(mockTxUpdate).not.toHaveBeenCalled()
		})

		it('contract edit is rejected like for an agent', async () => {
			setup(PARTNER, partnerBusiness(mockPrismaBusinessEmitido))

			const res = await put({ contract: 'X-1' })

			expect(res.status).toBe(403)
		})

		it('an agent gets the same outcome (parity)', async () => {
			setup(AGENT, {
				...mockPrismaBusinessEmitido,
				idBusiness: 10,
				idUser: AGENT.idUser,
			})

			const res = await put({ idProduct: 9 })

			expect(res.status).toBe(403)
		})
	})
})
