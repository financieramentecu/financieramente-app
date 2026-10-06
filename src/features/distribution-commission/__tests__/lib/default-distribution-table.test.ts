import { describe, expect, it } from 'vitest'
import {
	DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL,
	resolveDefaultDistributionRows,
} from '@/features/distribution-commission/lib/default-distribution-table'
import { LEADERSHIP_ROUTE_DISTRIBUTION } from '@/features/distribution-commission/__tests__/fixtures/leadership-route-table'

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

	it('locks every receiver and percentage of the leadership route', () => {
		expect(DEFAULT_DISTRIBUTION_BY_CONFIG_LEVEL).toEqual(
			LEADERSHIP_ROUTE_DISTRIBUTION
		)
	})

	it('treats Override 17% as the sum of LEVEL_0 upline lines, not a stored row', () => {
		const upline = LEADERSHIP_ROUTE_DISTRIBUTION.LEVEL_0.filter(
			(row) => row.receiverCode !== 'LEVEL_0'
		)
		const override = upline.reduce((total, row) => total + row.percentage, 0)

		expect(upline.map((row) => row.percentage)).toEqual([
			0.0085, 0.017, 0.0255, 0.034, 0.085,
		])
		expect(override).toBeCloseTo(0.17, 6)
	})

	it('returns null for a level outside the template', async () => {
		const rows = await resolveDefaultDistributionRows({}, 'GENERAL_LEVEL')
		expect(rows).toBeNull()
	})
})
