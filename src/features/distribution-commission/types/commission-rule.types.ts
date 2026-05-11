/**
 * Domain types for Commission Rules feature
 * Decoupled from Prisma types
 */

export interface CommissionRuleCategory {
	readonly id: number
	readonly idLevel: number
	readonly idProductPercentageCommission: number
	porcentajeDistribucion: number // 0–100 scale for UI. Stored as fraction in DB (Decimal(8,6)).
	porcentajePortfolio?: number // 0–100 when present (portfolio enabled historically or stored)
	active: boolean
	readonly createdAt: string
	readonly updatedAt: string
	category?: {
		readonly idLevel: number
		name: string
	}
}

export interface CommissionRule {
	readonly id: number // idProductPercentageCommission
	readonly idProductConfiguration: number
	description: string | null
	active: boolean
	hasPortfolio: boolean
	readonly createdAt: string
	readonly updatedAt: string
	categories: CommissionRuleCategory[]
	isDefaultForNewBusinesses?: boolean
}

export interface CreateCommissionRuleInput {
	idProductConfiguration: number
	description?: string
	hasPortfolio?: boolean
	categories?: {
		idLevel: number
		percentage: number
		portfolioPercentage?: number
	}[]
}

export interface UpdateCommissionRuleInput {
	idProductPercentageCommission: number
	description?: string
	active?: boolean
	hasPortfolio?: boolean
	categories?: {
		idLevel: number
		percentage: number
		portfolioPercentage?: number
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
