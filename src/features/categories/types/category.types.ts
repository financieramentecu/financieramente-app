/**
 * Types for the Categories feature
 */

/**
 * Category type constants
 */
export const CATEGORY_TYPES = ['MMS', 'ALIADO', 'TRINITY'] as const
export type CategoryType = (typeof CATEGORY_TYPES)[number]

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
	status: boolean
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
	status: boolean
}

/**
 * Input for updating an existing category
 */
export interface UpdateCategoryInput {
	code?: string
	name?: string
	typeCategory?: string
	descripcion?: string | null
	status?: boolean
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
