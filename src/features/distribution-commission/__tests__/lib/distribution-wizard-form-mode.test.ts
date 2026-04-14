import { describe, expect, it } from 'vitest'
import { findActiveRulePendingDistribution } from '@/features/distribution-commission/lib/distribution-wizard-form-mode'
import type { CommissionRule } from '@/features/distribution-commission/types/commission-rule.types'

function rule(
	overrides: Partial<CommissionRule> & Pick<CommissionRule, 'id'>
): CommissionRule {
	return {
		idProductConfiguration: 1,
		description: null,
		active: true,
		hasPortfolio: false,
		createdAt: '',
		updatedAt: '',
		categories: [],
		...overrides,
	}
}

describe('findActiveRulePendingDistribution', () => {
	it('returns the active rule with no categories', () => {
		const shell = rule({ id: 1, categories: [] })
		const full = rule({
			id: 2,
			categories: [
				{
					id: 10,
					idCategory: 3,
					idProductPercentageCommission: 2,
					porcentajeDistribucion: 50,
					active: true,
					createdAt: '',
					updatedAt: '',
				},
			],
		})
		expect(findActiveRulePendingDistribution([full, shell])).toEqual(shell)
	})

	it('returns undefined when every active rule has categories', () => {
		const full = rule({
			id: 2,
			categories: [
				{
					id: 10,
					idCategory: 3,
					idProductPercentageCommission: 2,
					porcentajeDistribucion: 50,
					active: true,
					createdAt: '',
					updatedAt: '',
				},
			],
		})
		expect(findActiveRulePendingDistribution([full])).toBeUndefined()
	})

	it('ignores inactive rules', () => {
		const inactive = rule({ id: 1, active: false, categories: [] })
		expect(findActiveRulePendingDistribution([inactive])).toBeUndefined()
	})
})
