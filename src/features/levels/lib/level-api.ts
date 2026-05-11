import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Level,
	LevelFilters,
	CreateLevelInput,
	UpdateLevelInput,
	LevelListResponse,
} from '../types/level.types'

/**
 * API client for levels
 * Returns ApiResponse<T> following project standards
 */
export const levelApi = {
	/**
	 * Gets the list of levels with pagination and search
	 */
	async getLevels(
		params?: LevelFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<LevelListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.typeLevel) queryParams.set('typeLevel', params.typeLevel)
			if (params?.status) queryParams.set('status', params.status)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const data = await apiClient.get<ApiResponse<LevelListResponse>>(
				`/levels${queryString ? `?${queryString}` : ''}`
			)

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener niveles',
			}
		}
	},

	/**
	 * Gets a level by ID
	 */
	async getLevel(id: number): Promise<ApiResponse<Level>> {
		try {
			const data = await apiClient.get<ApiResponse<Level>>(
				`/levels/${id}`
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener nivel',
			}
		}
	},

	/**
	 * Creates a new level
	 */
	async createLevel(input: CreateLevelInput): Promise<ApiResponse<Level>> {
		try {
			const data = await apiClient.post<ApiResponse<Level>>(
				'/levels',
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear nivel',
			}
		}
	},

	/**
	 * Updates an existing level
	 */
	async updateLevel(
		id: number,
		input: UpdateLevelInput
	): Promise<ApiResponse<Level>> {
		try {
			const data = await apiClient.put<ApiResponse<Level>>(
				`/levels/${id}`,
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar nivel',
			}
		}
	},

	/**
	 * Hard-deletes a level (validates no relations exist)
	 */
	async deleteLevel(id: number): Promise<ApiResponse<void>> {
		try {
			await apiClient.delete(`/levels/${id}`)
			return { data: undefined }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar nivel',
			}
		}
	},

	/**
	 * Soft-deletes (deactivates) a level by setting status to false.
	 */
	async deactivateLevel(id: number): Promise<ApiResponse<Level>> {
		try {
			const data = await apiClient.put<ApiResponse<Level>>(
				`/levels/${id}`,
				{ status: false }
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al desactivar nivel',
			}
		}
	},
}
