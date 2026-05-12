import {
	CommissionRule,
	CommissionRuleCategory,
} from '../../types/commission-rule.types'

export const mockCommissionRuleCategory = (
	overrides?: Partial<CommissionRuleCategory>
): CommissionRuleCategory => ({
	id: 1,
	idLevel: 101,
	idProductPercentageCommission: 1,
	porcentajeDistribucion: 50,
	active: true,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	category: {
		idLevel: 101,
		name: 'Mock Category',
	},
	...overrides,
})

export const mockCommissionRule = (
	overrides?: Partial<CommissionRule>
): CommissionRule => ({
	id: 1,
	idProductConfiguration: 50,
	description: 'Mock Rule Description',
	active: true,
	hasPortfolio: false,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	categories: [mockCommissionRuleCategory()],
	...overrides,
})
