import {
	CommissionRule,
	CommissionRuleCategory,
} from '../../types/commission-rule.types'

export const mockCommissionRuleCategory = (
	overrides?: Partial<CommissionRuleCategory>
): CommissionRuleCategory => ({
	id: 1,
	idCategory: 101,
	idProductPercentageCommission: 1,
	porcentajeDistribucion: 50,
	active: true,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	category: {
		idCategory: 101,
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
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	categories: [mockCommissionRuleCategory()],
	// @ts-expect-error Mocking Prisma structure which differs from domain
	productPercentageCommissionCategories: [
		{
			id: 1,
			idCategory: 101,
			idProductPercentageCommission: 1,
			porcentajeDistribucion: 50,
			active: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			category: {
				idCategory: 101,
				name: 'Mock Category',
			},
		},
	],
	...overrides,
})
