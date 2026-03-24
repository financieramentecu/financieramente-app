/**
 * Types for the Category Types administration feature
 */

/**
 * CategoryType interface (mapped from Prisma, not using Prisma types directly)
 */
export interface CategoryType extends Record<string, unknown> {
    readonly id: number
    name: string
    description: string | null
    status: boolean
    readonly createdAt: string
    readonly updatedAt: string
}

/**
 * Filters for category type search/listing
 */
export interface CategoryTypeFilters {
    search?: string
    status?: string
}

/**
 * Input for creating a new category type
 */
export interface CreateCategoryTypeInput {
    name: string
    description?: string | null
    status: boolean
}

/**
 * Input for updating an existing category type
 */
export interface UpdateCategoryTypeInput {
    name?: string
    description?: string | null
    status?: boolean
}

/**
 * Response structure for category type list with pagination
 */
export interface CategoryTypeListResponse {
    categoryTypes: CategoryType[]
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}
