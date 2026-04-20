import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ProductConfiguration,
	ProductConfigurationFilters,
	CreateProductConfigurationInput,
	UpdateProductConfigurationInput,
	ProductConfigurationListResponse,
} from '../types/product-configuration.types'

/**
 * API client for product configurations
 * Returns ApiResponse<T> following project standards
 */
export const productConfigurationApi = {
	/**
	 * Gets the list of product configurations with pagination and search
	 */
	async getProductConfigurations(
		params?: ProductConfigurationFilters & {
			page?: number
			pageSize?: number
		}
	): Promise<ApiResponse<ProductConfigurationListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.active) queryParams.set('active', params.active)
			if (params?.page)
				queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const response = await fetch(
				`/api/product-configurations${queryString ? `?${queryString}` : ''}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<ProductConfigurationListResponse> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in data
							? data.error
							: 'Error al obtener configuraciones de producto',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener configuraciones de producto',
			}
		}
	},

	/**
	 * Gets a product configuration by ID
	 */
	async getProductConfiguration(
		id: number
	): Promise<ApiResponse<ProductConfiguration>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${id}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<ProductConfiguration> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in data
							? data.error
							: 'Error al obtener configuración de producto',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener configuración de producto',
			}
		}
	},

	/**
	 * Gets a product configuration by unique code (URL segment must be encoded).
	 */
	async getProductConfigurationByCode(
		code: string
	): Promise<ApiResponse<ProductConfiguration>> {
		try {
			const encoded = encodeURIComponent(code)
			const response = await fetch(
				`/api/product-configurations/by-code/${encoded}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<ProductConfiguration> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in data
							? data.error
							: 'Error al obtener configuración de producto',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener configuración de producto',
			}
		}
	},

	/**
	 * Creates a new product configuration
	 */
	async createProductConfiguration(
		data: CreateProductConfigurationInput
	): Promise<ApiResponse<ProductConfiguration>> {
		try {
			const response = await fetch('/api/product-configurations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<ProductConfiguration> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al crear configuración de producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear configuración de producto',
			}
		}
	},

	/**
	 * Updates an existing product configuration
	 */
	async updateProductConfiguration(
		id: number,
		data: UpdateProductConfigurationInput
	): Promise<ApiResponse<ProductConfiguration>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${id}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data),
					credentials: 'include',
				}
			)

			const result: ApiResponse<ProductConfiguration> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al actualizar configuración de producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar configuración de producto',
			}
		}
	},

	/**
	 * Toggles the active status of a product configuration
	 */
	async toggleActive(
		id: number,
		active: boolean
	): Promise<ApiResponse<ProductConfiguration>> {
		try {
			const response = await fetch(
				`/api/product-configurations/${id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ active }),
					credentials: 'include',
				}
			)

			const result: ApiResponse<ProductConfiguration> =
				await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result
							? result.error
							: 'Error al cambiar estado de configuración de producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al cambiar estado de configuración de producto',
			}
		}
	},
}
