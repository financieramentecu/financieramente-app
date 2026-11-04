import { describe, it, expect } from 'vitest'
import { resolveDistributionLevel } from '@/features/negocios/lib/distribution-level'

describe('resolveDistributionLevel', () => {
	it('flags PARTNER_EXTERNAL as excluded from distribution', () => {
		expect(resolveDistributionLevel('PARTNER_EXTERNAL')).toEqual({
			levelCode: 'PARTNER_EXTERNAL',
			isDistributionExcluded: true,
		})
	})

	it('keeps a regular hierarchy level in distribution', () => {
		expect(resolveDistributionLevel('LEVEL_2')).toEqual({
			levelCode: 'LEVEL_2',
			isDistributionExcluded: false,
		})
	})

	it.each([null, undefined])(
		'treats a missing level (%s) as normalized null and not excluded',
		(missing) => {
			expect(resolveDistributionLevel(missing)).toEqual({
				levelCode: null,
				isDistributionExcluded: false,
			})
		}
	)
})
