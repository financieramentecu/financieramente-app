import {
	type ProductPercentageCommission,
	type ProductPercentageCommissionCategory,
	type Category,
} from '@prisma/client'

export interface CommissionRule extends ProductPercentageCommission {
	categories?: CommissionRuleCategory[]
}

export interface CommissionRuleCategory
	extends ProductPercentageCommissionCategory {
	category?: Category
}

export type CreateCommissionRuleInput = {
	idProductConfiguration: number
	description?: string
	categories?: {
		idCategory: number
		percentage: number // Stored as Decimal(5,4), input as number (e.g. 15 for 15%)
	}[]
}

export type UpdateCommissionRuleInput = {
	idProductPercentageCommission: number
	description?: string
	active?: boolean
	categories?: {
		idCategory: number
		percentage: number
	}[]
}
