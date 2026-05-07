import {
	AnnualPaymentStatus,
	Prisma,
	type Business,
	type ProductPercentageCommission,
} from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBusiness } from '@/features/negocios/actions/create-business'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
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
		isActive: true,
		...overrides,
	}
}

describe('createBusiness', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(findProductPercentageCommission).mockResolvedValue({
			data: {
				idProductPercentageCommission: 99,
			} as ProductPercentageCommission,
		})
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idCategoria: 5,
		} as Awaited<ReturnType<typeof prisma.user.findUnique>>)
		vi.mocked(prisma.product.findUnique).mockResolvedValue({
			name: 'Producto Test',
			company: { name: 'Compañia Test' },
		} as unknown as Awaited<ReturnType<typeof prisma.product.findUnique>>)
	})

	it('creates n annual_payment rows when periodicity is Anual and term is n', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Anual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({ term: 3, idBusiness: 10 })
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

		expect(result.data?.idBusiness).toBe(10)
		expect(annualCreateMany).toHaveBeenCalledTimes(1)
		const payload = annualCreateMany.mock.calls[0][0] as {
			data: Array<Record<string, unknown>>
		}
		expect(payload.data).toHaveLength(3)
		expect(payload.data[0].installmentIndex).toBe(1)
		expect(payload.data[2].installmentIndex).toBe(3)
		expect(payload.data[0].status).toBe(AnnualPaymentStatus.SIN_FONDEAR)
		expect(payload.data[0].idBusiness).toBe(10)
		for (const row of payload.data) {
			expect(row).not.toHaveProperty('dateAnchored')
		}
	})

	it('creates payment rows for non-Anual periodicity based on calculateNumAportes', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({ term: 12, idBusiness: 11, numAportes: 144 })
		const annualCreateMany = vi.fn().mockResolvedValue({ count: 144 })
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: {
					create: vi.fn().mockResolvedValue(created),
				},
				payment: { createMany: annualCreateMany },
			} as never)
		})

		await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
			term: 12,
		})

		// Mensual × 12 years = 144 payment rows
		expect(annualCreateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({ installmentIndex: 1 }),
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

	it('sets dateIssued when contract is provided on create', async () => {
		vi.mocked(prisma.buyPeriodicity.findUnique).mockResolvedValue({
			name: 'Mensual',
		} as Awaited<ReturnType<typeof prisma.buyPeriodicity.findUnique>>)
		const created = mockCreatedBusiness({
			idBusiness: 20,
			contract: 'PN9999999',
			status: 'EMITIDO',
		})
		const businessCreate = vi.fn().mockResolvedValue(created)
		vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
			return callback({
				business: { create: businessCreate },
				payment: { createMany: vi.fn() },
			} as never)
		})

		const result = await createBusiness({
			...basePayload,
			idBuyPeriodicity: 2,
			contract: 'PN9999999',
		})

		expect(result.data?.status).toBe('EMITIDO')
		expect(businessCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				status: 'EMITIDO',
				contract: 'PN9999999',
				dateIssued: expect.any(Date),
			}),
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
})
