/**
 * Types for the Categories feature (new simple model tied to CategoryType)
 */

/**
 * Category domain interface (mapped from Prisma Category model)
 * Simpler model: no code, no color, no beneficiaryMode, no self-ref
 */
export interface Category extends Record<string, unknown> {
	readonly id: number
	name: string
	description?: string | null
	status: boolean
	idCategoryType: number
	categoryType?: { name: string }
	readonly createdAt: string
	readonly updatedAt: string
}

/**
 * Filters for category search/listing
 */
export interface CategoryFilters {
	search?: string
	status?: string
}

/**
 * Input for creating a new category
 */
export interface CreateCategoryInput {
	name: string
	idCategoryType: number
	description?: string | null
	status?: boolean
}

/**
 * Input for updating an existing category
 */
export interface UpdateCategoryInput {
	name?: string
	idCategoryType?: number
	description?: string | null
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
