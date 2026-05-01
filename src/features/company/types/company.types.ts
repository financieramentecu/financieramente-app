import { Currency } from '@/features/admin/currencies/types/currency.types'

/**
 * Company interface (mapped from Prisma, not using Prisma types directly)
 */
export interface Company extends Record<string, unknown> {
	readonly idCompany: number
	name: string
	idCurrency: number | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
	currency?: Currency
}

/**
 * Filters for company search/listing
 */
export interface CompanyFilters {
	search?: string
	status?: string
}

/**
 * Input for creating a new company
 */
export interface CreateCompanyInput {
	name: string
	idCurrency: number
	status: boolean
}

/**
 * Input for updating an existing company
 */
export interface UpdateCompanyInput {
	name?: string
	idCurrency?: number
	status?: boolean
}

/**
 * Response structure for company list with pagination
 */
export interface CompanyListResponse {
	companies: Company[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
