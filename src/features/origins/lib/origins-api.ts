import { apiClient } from '@/lib/api/client'
import type { ClientOrigin as PrismaClientOrigin } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ClientOrigin,
	ClientOriginFilters,
	CreateClientOriginInput,
	UpdateClientOriginInput,
	ClientOriginListResponse,
	ProductOrigin,
	CreateProductOriginInput,
	UpdateProductOriginInput,
} from '../types/origins.types'

/**
 * Server-side function to get active product origins.
 * Note: ProductOrigin is not a direct Prisma model yet, using the domain interface.
 */
export async function getProductOrigins(): Promise<ProductOrigin[]> {
	// Fallback to empty until model exists or use a generic query if stored elsewhere
	return []
}

/**
 * --- CLIENT-SIDE API ---
 * Retorna ApiResponse<T> según el estándar del proyecto.
 */
export const originsApi = {
	// CLIENT ORIGINS

	/**
	 * Obtiene la lista de orígenes de cliente con paginación y búsqueda
	 */
	async getClientOrigins(
		params?: ClientOriginFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<ClientOriginListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.status) queryParams.set('status', params.status)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const response = await fetch(
				`/api/origins${queryString ? `?${queryString}` : ''}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<ClientOriginListResponse> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener orígenes de cliente',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido al obtener orígenes de cliente',
			}
		}
	},

	async getClientOrigin(id: number): Promise<ApiResponse<ClientOrigin>> {
		try {
			const response = await fetch(`/api/origins/${id}`, {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			const data: ApiResponse<ClientOrigin> = await response.json()
			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener origen de cliente',
				}
			}
			return data
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido al obtener origen de cliente',
			}
		}
	},

	async createClientOrigin(data: CreateClientOriginInput): Promise<ApiResponse<ClientOrigin>> {
		try {
			const response = await fetch('/api/origins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
			const result: ApiResponse<ClientOrigin> = await response.json()
			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al crear origen de cliente',
				}
			}
			return result
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido al crear origen de cliente',
			}
		}
	},

	async updateClientOrigin(id: number, data: UpdateClientOriginInput): Promise<ApiResponse<ClientOrigin>> {
		try {
			const response = await fetch(`/api/origins/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
			const result: ApiResponse<ClientOrigin> = await response.json()
			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al actualizar origen de cliente',
				}
			}
			return result
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido al actualizar origen de cliente',
			}
		}
	},

	async deleteClientOrigin(id: number): Promise<ApiResponse<void>> {
		try {
			const response = await fetch(`/api/origins/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			})
			const result: ApiResponse<void> = await response.json()
			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al eliminar origen de cliente',
				}
			}
			return result
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido al eliminar origen de cliente',
			}
		}
	},

	// PRODUCT ORIGINS (ADMIN)
	
	async getProductOrigins(): Promise<ProductOrigin[]> {
		const response = await apiClient.get<{ origins: ProductOrigin[] }>('/admin/product-origins')
		return response.origins
	},

	async createProductOrigin(data: CreateProductOriginInput): Promise<ProductOrigin> {
		const response = await apiClient.post<{ origin: ProductOrigin }>('/admin/product-origins', data)
		return response.origin
	},

	async updateProductOrigin(id: number, data: UpdateProductOriginInput): Promise<ProductOrigin> {
		const response = await apiClient.put<{ origin: ProductOrigin }>(`/admin/product-origins/${id}`, data)
		return response.origin
	},

	async deleteProductOrigin(id: number): Promise<void> {
		await apiClient.delete(`/admin/product-origins/${id}`)
	},
}
