import { describe, expect, it } from 'vitest'
import { resolveDefaultDistributionRows } from '@/features/distribution-commission/lib/default-distribution-table'

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
		expect(rows).toEqual([{ receiverCode: 'LEVEL_5', percentage: 0.6 }])
	})

	it('returns null for a level outside the template', async () => {
		const rows = await resolveDefaultDistributionRows({}, 'GENERAL_LEVEL')
		expect(rows).toBeNull()
	})
})
