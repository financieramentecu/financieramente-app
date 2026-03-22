import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
    CategoryType,
    CategoryTypeFilters,
    CreateCategoryTypeInput,
    UpdateCategoryTypeInput,
    CategoryTypeListResponse,
} from '../types/category-type.types'

/**
 * API client for Category Types feature
 * Returns ApiResponse<T> following project standards
 */
export const categoryTypeApi = {
    /**
     * Get a list of category types with pagination and optional filters
     */
    getCategoryTypes: async (
        filters?: CategoryTypeFilters,
        page = 1,
        pageSize = 10
    ): Promise<ApiResponse<CategoryTypeListResponse>> => {
        try {
            const searchParams = new URLSearchParams()
            searchParams.set('page', page.toString())
            searchParams.set('pageSize', pageSize.toString())

            if (filters?.search) {
                searchParams.set('search', filters.search)
            }

            if (filters?.status !== undefined && filters?.status !== '') {
                searchParams.set('status', String(filters.status))
            }

            const response = await fetch(
                `/api/category-types?${searchParams.toString()}`,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            const result: ApiResponse<CategoryTypeListResponse> =
                await response.json()

            return result
        } catch (error) {
            return {
                data: null,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al obtener tipos de categoría',
            }
        }
    },

    /**
     * Get a single category type by ID
     */
    getCategoryType: async (id: number): Promise<ApiResponse<CategoryType>> => {
        try {
            const response = await fetch(`/api/category-types/${id}`, {
                headers: { 'Content-Type': 'application/json' },
            })
            const result: ApiResponse<CategoryType> = await response.json()
            return result
        } catch (error) {
            return {
                data: null,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error al obtener tipo de categoría',
            }
        }
    },

    /**
     * Create a new category type
     */
    createCategoryType: async (
        data: CreateCategoryTypeInput
    ): Promise<ApiResponse<CategoryType>> => {
        try {
            const response = await fetch('/api/category-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result: ApiResponse<CategoryType> = await response.json()
            return result
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Error al crear',
            }
        }
    },

    /**
     * Update an existing category type
     */
    updateCategoryType: async (
        id: number,
        data: UpdateCategoryTypeInput
    ): Promise<ApiResponse<{ categoryType: CategoryType; hasReferences: boolean }>> => {
        try {
            const response = await fetch(`/api/category-types/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result: ApiResponse<{
                categoryType: CategoryType
                hasReferences: boolean
            }> = await response.json()
            return result
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Error al actualizar',
            }
        }
    },

    /**
     * Toggle active status
     */
    toggleStatus: async (id: number): Promise<ApiResponse<CategoryType>> => {
        try {
            const response = await fetch(`/api/category-types/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            })
            const result: ApiResponse<CategoryType> = await response.json()
            return result
        } catch (error) {
            return {
                data: null,
                error:
                    error instanceof Error ? error.message : 'Error al cambiar estado',
            }
        }
    },

    /**
     * Delete a category type
     */
    deleteCategoryType: async (id: number): Promise<ApiResponse<null>> => {
        try {
            const response = await fetch(`/api/category-types/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            })
            const result: ApiResponse<null> = await response.json()
            return result
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Error al eliminar',
            }
        }
    },
}

