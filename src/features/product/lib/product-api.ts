import { prisma } from '@/lib/prisma'
import type { Product as PrismaProduct } from '@prisma/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Product,
	ProductFilters,
	CreateProductInput,
	UpdateProductInput,
	ProductListResponse,
	CompanyOption,
} from '../types/product.types'

/**
 * --- SERVER-SIDE FUNCTIONS ---
 * Use these in Server Components and API Routes.
 */

/**
 * Server-side function to get active products.
 */
export async function getProducts(): Promise<PrismaProduct[]> {
	return await prisma.product.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}

/**
 * --- CLIENT-SIDE API ---
 * Cliente API para productos
 * Retorna ApiResponse<T> según el estándar del proyecto
 */
export const productApi = {
	/**
	 * Obtiene la lista de productos con paginación y búsqueda
	 */
	async getProducts(
		params?: ProductFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<ProductListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.status) queryParams.set('status', params.status)
			
			// Handle both idCompany (number) and companyId (string alias)
			const companyId = params?.idCompany || params?.companyId
			if (companyId && companyId !== 'all') {
				queryParams.set('idCompany', companyId.toString())
			}
			
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const response = await fetch(
				`/api/products${queryString ? `?${queryString}` : ''}`,
				{
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			)

			const data: ApiResponse<ProductListResponse> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener productos',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener productos',
			}
		}
	},

	/**
	 * Obtiene un producto por ID
	 */
	async getProduct(id: number): Promise<ApiResponse<Product>> {
		try {
			const response = await fetch(`/api/products/${id}`, {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data: ApiResponse<Product> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener producto',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener producto',
			}
		}
	},

	/**
	 * Crea un nuevo producto
	 */
	async createProduct(data: CreateProductInput): Promise<ApiResponse<Product>> {
		try {
			const response = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Product> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in result ? result.error : 'Error al crear producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear producto',
			}
		}
	},

	/**
	 * Actualiza un producto existente
	 */
	async updateProduct(
		id: number,
		data: UpdateProductInput
	): Promise<ApiResponse<Product>> {
		try {
			const response = await fetch(`/api/products/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
				credentials: 'include',
			})

			const result: ApiResponse<Product> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result ? result.error : 'Error al actualizar producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar producto',
			}
		}
	},

	/**
	 * Elimina un producto
	 */
	async deleteProduct(id: number): Promise<ApiResponse<void>> {
		try {
			const response = await fetch(`/api/products/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			})

			const result: ApiResponse<void> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error:
						'error' in result ? result.error : 'Error al eliminar producto',
				}
			}

			return result
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar producto',
			}
		}
	},

	/**
	 * Obtiene compañías activas (necesario para selects en admin)
	 */
	async getActiveCompanies(): Promise<ApiResponse<CompanyOption[]>> {
		try {
			const response = await fetch('/api/admin/companies?status=active', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const data: ApiResponse<CompanyOption[]> = await response.json()

			if (!response.ok) {
				return {
					data: null,
					error: 'error' in data ? data.error : 'Error al obtener compañías',
				}
			}

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener compañías',
			}
		}
	},
}
