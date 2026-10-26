import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'
import { createProductWithBaseConfigurations } from '@/features/product/services/create-product.service'
import { PRODUCT_CREATE_ERROR } from '@/features/product/lib/product-create-error'

const { prisma } = vi.hoisted(() => {
	const client = {
		company: { findUnique: vi.fn() },
		product: { findFirst: vi.fn(), create: vi.fn() },
		level: { findMany: vi.fn() },
		productConfiguration: { create: vi.fn(), update: vi.fn() },
		productPercentageCommission: { create: vi.fn() },
		productPercentageCommissionCategory: { create: vi.fn(), createMany: vi.fn() },
		$transaction: vi.fn(),
	}
	client.$transaction.mockImplementation(
		async (callback: (tx: typeof client) => Promise<unknown>) => callback(client)
	)
	return { prisma: client }
})

vi.mock('@/lib/prisma', () => ({ prisma }))

const input = {
	name: 'universal nova',
	description: null,
	idCompany: 4,
	idTypeProduct: null,
	status: true,
	commissionPercentage: 0,
	contributionType: 'REGULAR' as const,
}

describe('createProductWithBaseConfigurations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		prisma.$transaction.mockImplementation(
			async (callback: (tx: typeof prisma) => Promise<unknown>) =>
				callback(prisma)
		)
		prisma.company.findUnique.mockResolvedValue({
			idCompany: 4,
			name: 'BMI',
			status: true,
		})
		prisma.product.findFirst.mockResolvedValue(null)
		const receiverLevels = [
			{ idLevel: 1, code: 'LEVEL_0' },
			{ idLevel: 2, code: 'LEVEL_1' },
			{ idLevel: 3, code: 'LEVEL_2' },
			{ idLevel: 4, code: 'LEVEL_3' },
			{ idLevel: 5, code: 'LEVEL_4' },
			{ idLevel: 6, code: 'LEVEL_5' },
			{ idLevel: 7, code: 'GENERAL_LEVEL' },
		]
		prisma.level.findMany.mockImplementation(
			async (args: { where?: { code?: { in?: string[] } } }) => {
				const wanted = args?.where?.code?.in
				if (wanted) {
					return receiverLevels.filter((level) => wanted.includes(level.code))
				}
				return [
					{ idLevel: 1, code: 'LEVEL_0' },
					{ idLevel: 7, code: 'GENERAL_LEVEL' },
				]
			}
		)
		prisma.productPercentageCommissionCategory.createMany.mockResolvedValue({
			count: 6,
		})
		prisma.product.create.mockResolvedValue({
			idProduct: 93,
			name: 'Universal nova',
			company: { name: 'BMI' },
			commissionPercentage: new Prisma.Decimal(0),
		})
		prisma.productConfiguration.create
			.mockResolvedValueOnce({ id: 10 })
			.mockResolvedValueOnce({ id: 11 })
		prisma.productPercentageCommission.create
			.mockResolvedValueOnce({ idProductPercentageCommission: 50 })
			.mockResolvedValueOnce({ idProductPercentageCommission: 51 })
		prisma.productConfiguration.update.mockResolvedValue({ id: 10 })
	})

	it('creates the product and one structural configuration per active level', async () => {
		const result = await createProductWithBaseConfigurations(input)

		expect(result.baseConfigurationCount).toBe(2)
		expect(result.product.idProduct).toBe(93)
		expect(prisma.product.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ name: 'Universal nova' }),
			})
		)
		expect(prisma.productConfiguration.create).toHaveBeenCalledTimes(2)
		expect(prisma.productPercentageCommissionCategory.createMany).toHaveBeenCalledTimes(
			1
		)
	})

	it('fails before creating the product when there are no active levels', async () => {
		prisma.level.findMany.mockResolvedValue([])

		await expect(createProductWithBaseConfigurations(input)).rejects.toMatchObject({
			code: PRODUCT_CREATE_ERROR.NO_ACTIVE_LEVELS,
		})
		expect(prisma.product.create).not.toHaveBeenCalled()
	})

	it('fails when the company is inactive', async () => {
		prisma.company.findUnique.mockResolvedValue({
			idCompany: 4,
			name: 'BMI',
			status: false,
		})

		await expect(createProductWithBaseConfigurations(input)).rejects.toMatchObject({
			code: PRODUCT_CREATE_ERROR.COMPANY_INACTIVE,
		})
		expect(prisma.product.create).not.toHaveBeenCalled()
	})
})
