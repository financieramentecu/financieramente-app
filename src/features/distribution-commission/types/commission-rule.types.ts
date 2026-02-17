/**
 * Domain types for Commission Rules feature
 * Decoupled from Prisma types
 */

export interface CommissionRuleCategory {
	readonly id: number
	readonly idCategory: number
	readonly idProductPercentageCommission: number
	porcentajeDistribucion: number // Whole number (15 = 15%). Stored as Decimal(5,4) in DB.
	active: boolean
	readonly createdAt: string
	readonly updatedAt: string
	category?: {
		readonly idCategory: number
		name: string
	}
}

export interface CommissionRule {
	readonly id: number // idProductPercentageCommission
	readonly idProductConfiguration: number
	description: string | null
	active: boolean
	readonly createdAt: string
	readonly updatedAt: string
	categories: CommissionRuleCategory[]
	isDefaultForNewBusinesses?: boolean
}

export interface CreateCommissionRuleInput {
	idProductConfiguration: number
	description?: string
	categories?: {
		idCategory: number
		percentage: number
	}[]
}

export interface UpdateCommissionRuleInput {
	idProductPercentageCommission: number
	description?: string
	active?: boolean
	categories?: {
		idCategory: number
		percentage: number
	}[]
}

export interface CommissionRuleListResponse {
	rules: CommissionRule[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export interface AssignNewBusinessesResponse {
	idProductConfiguration: number
	idProductPercentageCommissionNewBusinesses: number | null
}
export interface CommissionRuleFilters {
	search?: string
	active?: string // 'true' | 'false' | 'all'
}
