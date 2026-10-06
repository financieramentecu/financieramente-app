import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { createStructuralProductConfiguration } from '@/features/product-configuration/services/product-configuration.service'
import { LEADERSHIP_ROUTE_DISTRIBUTION } from '@/features/distribution-commission/__tests__/fixtures/leadership-route-table'

const receiverLevels = [
	{ idLevel: 1, code: 'LEVEL_0' },
	{ idLevel: 2, code: 'LEVEL_1' },
	{ idLevel: 3, code: 'LEVEL_2' },
	{ idLevel: 4, code: 'LEVEL_3' },
	{ idLevel: 5, code: 'LEVEL_4' },
	{ idLevel: 6, code: 'LEVEL_5' },
]

const levelIdByCode = Object.fromEntries(
	receiverLevels.map((level) => [level.code, level.idLevel])
)

function createTransaction() {
	return {
		productConfiguration: {
			create: vi.fn().mockResolvedValue({ id: 10 }),
			update: vi.fn().mockResolvedValue({ id: 10 }),
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
}

describe('createStructuralProductConfiguration', () => {
	it.each(Object.entries(LEADERSHIP_ROUTE_DISTRIBUTION))(
		'persists the exact leadership-route lines for %s',
		async (levelCode, rows) => {
			const tx = createTransaction()

			await createStructuralProductConfiguration(
				tx as unknown as Prisma.TransactionClient,
				{
					idProduct: 93,
					idLevel: levelIdByCode[levelCode],
					levelCode,
					code: `BMI-UNIVERSAL_NOVA-${levelCode}`,
					active: true,
				}
			)

			expect(tx.productPercentageCommissionCategory.createMany).toHaveBeenCalledWith({
				data: rows.map((row) => ({
					idProductPercentageCommission: 50,
					idLevel: levelIdByCode[row.receiverCode],
					porcentajeDistribucion: row.percentage,
					active: true,
				})),
			})
		}
	)

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
