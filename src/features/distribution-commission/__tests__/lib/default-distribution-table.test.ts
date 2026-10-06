import { describe, expect, it } from 'vitest'
import {
	DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL,
	resolveDefaultDistributionRows,
} from '@/features/distribution-commission/lib/default-distribution-table'

describe('resolveDefaultDistributionRows', () => {
	it('uses saved template rows when the level has them', async () => {
		const rows = await resolveDefaultDistributionRows(
			{
				defaultDistributionPercentage: {
					findMany: async () => [
						{
							percentage: '0.550000',
							receiverLevel: { code: 'LEVEL_0' },
						},
					],
				},
			},
			'LEVEL_0'
		)

		expect(rows).toEqual([{ receiverCode: 'LEVEL_0', percentage: 0.55 }])
	})

	it('falls back to the built-in table when nothing is stored', async () => {
		const rows = await resolveDefaultDistributionRows({}, 'LEVEL_5')
		expect(rows).toEqual([{ receiverCode: 'LEVEL_5', percentage: 0.77 }])
	})

	it('matches the leadership route and sums to 77% on every level', () => {
		for (const rows of Object.values(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL)) {
			const sum = rows.reduce((total, row) => total + row.percentage, 0)
			expect(sum).toBeCloseTo(0.77, 6)
		}
		expect(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL.LEVEL_0).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ receiverCode: 'LEVEL_0', percentage: 0.6 }),
			])
		)
		expect(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL.LEVEL_1).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ receiverCode: 'LEVEL_1', percentage: 0.6085 }),
			])
		)
		expect(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL.LEVEL_4).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ receiverCode: 'LEVEL_4', percentage: 0.685 }),
			])
		)
	})

	it('returns null for a level outside the template', async () => {
		const rows = await resolveDefaultDistributionRows({}, 'GENERAL_LEVEL')
		expect(rows).toBeNull()
	})
})
