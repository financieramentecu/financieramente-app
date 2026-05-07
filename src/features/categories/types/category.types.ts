/**
 * Types for the Categories feature
 */

/**
 * Category type constants
 */
export const CATEGORY_TYPES = ['MMS', 'ALIADO', 'TRINITY'] as const
export type CategoryType = (typeof CATEGORY_TYPES)[number]

/**
 * System category type name constant — used to detect system-managed categories
 */
export const SYSTEM_CATEGORY_TYPE_NAME = 'SISTEMA' as const

/**
 * Beneficiary mode for commission distribution
 */
export type BeneficiaryMode = 'OVERRIDE' | 'BENEFICIARIO_GENERAL'

/**
 * Fixed beneficiary user data (minimal projection)
 */
export interface FixedBeneficiaryUser {
	readonly idUser: number
	name: string
	lastName: string
	email: string
}

/**
 * Minimal next category projection (for self-referential sequence)
 */
export interface NextCategory {
	readonly id: number
	name: string
}

/**
 * Category interface (mapped from Prisma, not using Prisma types directly)
 */
export interface Category extends Record<string, unknown> {
	readonly idCategory: number
	code: string
	name: string
	typeCategory: string
	idCategoryType?: number
	descripcion: string | null
	color: string
	status: boolean
	beneficiaryMode: BeneficiaryMode
	idFixedBeneficiaryUser: number | null
	fixedBeneficiaryUser?: FixedBeneficiaryUser | null
	idNextCategory: number | null
	nextCategory: NextCategory | null
	readonly createdAt: string
	readonly updatedAt: string
}

/**
 * Filters for category search/listing
 */
export interface CategoryFilters {
	search?: string
	typeCategory?: string
	status?: string
}

/**
 * Input for creating a new category
 */
export interface CreateCategoryInput {
	code: string
	name: string
	typeCategory: string
	descripcion?: string | null
	color: string
	status: boolean
	beneficiaryMode?: BeneficiaryMode
	idFixedBeneficiaryUser?: number | null
	idNextCategory?: number | null
}

/**
 * Input for updating an existing category
 */
export interface UpdateCategoryInput {
	code?: string
	name?: string
	typeCategory?: string
	descripcion?: string | null
	color?: string
	status?: boolean
	beneficiaryMode?: BeneficiaryMode
	idFixedBeneficiaryUser?: number | null
	idNextCategory?: number | null
}

/**
 * Response structure for category list with pagination
 */
export interface CategoryListResponse {
	categories: Category[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
