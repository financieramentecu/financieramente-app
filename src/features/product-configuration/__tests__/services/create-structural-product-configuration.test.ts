import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { createStructuralProductConfiguration } from '@/features/product-configuration/services/product-configuration.service'

const receiverLevels = [
	{ idLevel: 1, code: 'LEVEL_0' },
	{ idLevel: 2, code: 'LEVEL_1' },
	{ idLevel: 3, code: 'LEVEL_2' },
	{ idLevel: 4, code: 'LEVEL_3' },
	{ idLevel: 5, code: 'LEVEL_4' },
	{ idLevel: 6, code: 'LEVEL_5' },
]

describe('createStructuralProductConfiguration', () => {
	it('creates the configuration and the default LEVEL_0 distribution', async () => {
		const tx = {
			productConfiguration: {
				create: vi.fn().mockResolvedValue({ id: 10 }),
				update: vi.fn().mockResolvedValue({ id: 10, code: 'BMI-UNIVERSAL_NOVA-LEVEL_0' }),
			},
			productPercentageCommission: {
				create: vi.fn().mockResolvedValue({
					idProductPercentageCommission: 50,
				}),
			},
			level: {
				findMany: vi.fn().mockResolvedValue(receiverLevels),
			},
			productPercentageCommissionCategory: {
				createMany: vi.fn().mockResolvedValue({ count: 6 }),
			},
		}

		await createStructuralProductConfiguration(
			tx as unknown as Prisma.TransactionClient,
			{
				idProduct: 93,
				idLevel: 1,
				levelCode: 'LEVEL_0',
				code: 'BMI-UNIVERSAL_NOVA-LEVEL_0',
				active: true,
			}
		)

		expect(tx.productPercentageCommission.create).toHaveBeenCalledWith({
			data: {
				idProductConfiguration: 10,
				active: true,
				description: 'Distribución estándar LEVEL_0',
			},
		})
		expect(tx.productPercentageCommissionCategory.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					idProductPercentageCommission: 50,
					idLevel: 1,
					porcentajeDistribucion: 0.6,
					active: true,
				}),
			]),
		})
		const lines = tx.productPercentageCommissionCategory.createMany.mock.calls[0][0]
			.data as { porcentajeDistribucion: number }[]
		expect(lines).toHaveLength(6)
	})

	it('leaves GENERAL_LEVEL without invented percentages', async () => {
		const tx = {
			productConfiguration: {
				create: vi.fn().mockResolvedValue({ id: 11 }),
				update: vi.fn().mockResolvedValue({ id: 11 }),
			},
			productPercentageCommission: {
				create: vi.fn().mockResolvedValue({
					idProductPercentageCommission: 51,
				}),
			},
			level: { findMany: vi.fn() },
			productPercentageCommissionCategory: { createMany: vi.fn() },
		}

		await createStructuralProductConfiguration(
			tx as unknown as Prisma.TransactionClient,
			{
				idProduct: 93,
				idLevel: 7,
				levelCode: 'GENERAL_LEVEL',
				code: 'BMI-UNIVERSAL_NOVA-GENERAL_LEVEL',
				active: true,
			}
		)

		expect(tx.level.findMany).not.toHaveBeenCalled()
		expect(tx.productPercentageCommissionCategory.createMany).not.toHaveBeenCalled()
	})
})
