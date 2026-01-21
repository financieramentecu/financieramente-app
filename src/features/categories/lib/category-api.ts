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
			const response = await fetch(
				`/api/categories${queryString ? `?${queryString}` : ''}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<CategoryListResponse> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener categorías',
				}
			}

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
			const response = await fetch(`/api/categories/${id}`, {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data: ApiResponse<Category> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener categoría',
				}
			}

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
	async createCategory(data: CreateCategoryInput): Promise<ApiResponse<Category>> {
		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Category> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al crear categoría',
				}
			}

			return result
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
		data: UpdateCategoryInput
	): Promise<ApiResponse<Category>> {
		try {
			const response = await fetch(`/api/categories/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Category> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al actualizar categoría',
				}
			}

			return result
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
	 * Deletes a category
	 */
	async deleteCategory(id: number): Promise<ApiResponse<void>> {
		try {
			const response = await fetch(`/api/categories/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			})

			const result: ApiResponse<void> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al eliminar categoría',
				}
			}

			return result
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
}
