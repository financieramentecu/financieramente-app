import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Category,
	CategoryFilters,
	CreateCategoryInput,
	UpdateCategoryInput,
	CategoryListResponse,
} from '../types/category.types'

/**
 * API client for categories
 * Returns ApiResponse<T> following project standards
 */
export const categoryApi = {
	/**
	 * Gets the list of categories with pagination and search
	 * Used by both Domain and Admin views.
	 */
	async getCategories(
		params?: CategoryFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<CategoryListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.typeCategory) queryParams.set('typeCategory', params.typeCategory)
			if (params?.status) queryParams.set('status', params.status)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const data = await apiClient.get<ApiResponse<CategoryListResponse>>(
				`/categories${queryString ? `?${queryString}` : ''}`
			)

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener categorías',
			}
		}
	},

	/**
	 * Gets a category by ID
	 */
	async getCategory(id: number): Promise<ApiResponse<Category>> {
		try {
			const data = await apiClient.get<ApiResponse<Category>>(
				`/categories/${id}`
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener categoría',
			}
		}
	},

	/**
	 * Creates a new category
	 */
	async createCategory(input: CreateCategoryInput): Promise<ApiResponse<Category>> {
		try {
			const data = await apiClient.post<ApiResponse<Category>>(
				'/categories',
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear categoría',
			}
		}
	},

	/**
	 * Updates an existing category
	 */
	async updateCategory(
		id: number,
		input: UpdateCategoryInput
	): Promise<ApiResponse<Category>> {
		try {
			const data = await apiClient.put<ApiResponse<Category>>(
				`/categories/${id}`,
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar categoría',
			}
		}
	},

	/**
	 * Hard-deletes a category (validates no relations exist)
	 */
	async deleteCategory(id: number): Promise<ApiResponse<void>> {
		try {
			await apiClient.delete(`/categories/${id}`)
			return { data: undefined }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar categoría',
			}
		}
	},

	/**
	 * Soft-deletes (deactivates) a category by setting status to false.
	 * Used by admin views instead of hard delete.
	 */
	async deactivateCategory(id: number): Promise<ApiResponse<Category>> {
		try {
			const data = await apiClient.put<ApiResponse<Category>>(
				`/categories/${id}`,
				{ status: false }
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al desactivar categoría',
			}
		}
	},
}
