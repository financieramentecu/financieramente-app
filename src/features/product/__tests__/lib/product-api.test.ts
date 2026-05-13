import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productApi } from '../../lib/product-api'
import {
	createMockProduct,
	createMockProductListResponse,
} from '../fixtures/mock-product'

// Mock global fetch
global.fetch = vi.fn()

describe('productApi', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getProducts', () => {
		it('should fetch products successfully (happy path)', async () => {
			const mockResponse = createMockProductListResponse([
				createMockProduct({ idProduct: 1, name: 'Seguro de Vida' }),
				createMockProduct({ idProduct: 2, name: 'Seguro de Salud' }),
			])

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			const result = await productApi.getProducts()

			expect(result).toEqual({ data: mockResponse })
			expect(fetch).toHaveBeenCalledWith('/api/products', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		})

		it('should fetch products with search params', async () => {
			const mockResponse = createMockProductListResponse()
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			await productApi.getProducts({ search: 'Seguro', page: 1, pageSize: 10 })

			expect(fetch).toHaveBeenCalledWith(
				'/api/products?search=Seguro&page=1&pageSize=10',
				expect.any(Object)
			)
		})

		it('should fetch products with status filter', async () => {
			const mockResponse = createMockProductListResponse()
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			await productApi.getProducts({ status: 'active' })

			expect(fetch).toHaveBeenCalledWith(
				'/api/products?status=active',
				expect.any(Object)
			)
		})

		it('should fetch products with idCompany filter', async () => {
			const mockResponse = createMockProductListResponse()
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			await productApi.getProducts({ idCompany: 1 })

			expect(fetch).toHaveBeenCalledWith(
				'/api/products?idCompany=1',
				expect.any(Object)
			)
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error al obtener productos',
				}),
			} as Response)

			const result = await productApi.getProducts()

			expect(result).toEqual({
				data: null,
				error: 'Error al obtener productos',
			})
		})

		it('should handle API error without error message', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null }),
			} as Response)

			const result = await productApi.getProducts()

			expect(result).toEqual({
				data: null,
				error: 'Error al obtener productos',
			})
		})

		it('should handle network error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await productApi.getProducts()

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})

		it('should handle unknown error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce('Unknown error')

			const result = await productApi.getProducts()

			expect(result).toEqual({
				data: null,
				error: 'Error desconocido al obtener productos',
			})
		})
	})

	describe('getProduct', () => {
		it('should fetch single product successfully (happy path)', async () => {
			const mockProduct = createMockProduct({ idProduct: 1 })

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProduct }),
			} as Response)

			const result = await productApi.getProduct(1)

			expect(result).toEqual({ data: mockProduct })
			expect(fetch).toHaveBeenCalledWith('/api/products/1', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Producto no encontrado',
				}),
			} as Response)

			const result = await productApi.getProduct(999)

			expect(result).toEqual({
				data: null,
				error: 'Producto no encontrado',
			})
		})

		it('should handle network error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await productApi.getProduct(1)

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})

		it('should handle unknown error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce('Unknown error')

			const result = await productApi.getProduct(1)

			expect(result).toEqual({
				data: null,
				error: 'Error desconocido al obtener producto',
			})
		})
	})

	describe('createProduct', () => {
		it('should create product successfully (happy path)', async () => {
			const mockProduct = createMockProduct({
				idProduct: 1,
				name: 'Nuevo Seguro',
			})
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProduct }),
			} as Response)

			const result = await productApi.createProduct(createData)

			expect(result).toEqual({ data: mockProduct })
			expect(fetch).toHaveBeenCalledWith('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(createData),
				credentials: 'include',
			})
		})

		it('should handle API error response', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error al crear producto',
				}),
			} as Response)

			const result = await productApi.createProduct(createData)

			expect(result).toEqual({
				data: null,
				error: 'Error al crear producto',
			})
		})

		it('should handle network error', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await productApi.createProduct(createData)

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})

		it('should handle unknown error', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(fetch).mockRejectedValueOnce('Unknown error')

			const result = await productApi.createProduct(createData)

			expect(result).toEqual({
				data: null,
				error: 'Error desconocido al crear producto',
			})
		})
	})

	describe('updateProduct', () => {
		it('should update product successfully (happy path)', async () => {
			const mockProduct = createMockProduct({
				idProduct: 1,
				name: 'Seguro Actualizado',
			})
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockProduct }),
			} as Response)

			const result = await productApi.updateProduct(1, updateData)

			expect(result).toEqual({ data: mockProduct })
			expect(fetch).toHaveBeenCalledWith('/api/products/1', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
				credentials: 'include',
			})
		})

		it('should handle API error response', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error al actualizar producto',
				}),
			} as Response)

			const result = await productApi.updateProduct(1, updateData)

			expect(result).toEqual({
				data: null,
				error: 'Error al actualizar producto',
			})
		})

		it('should handle network error', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await productApi.updateProduct(1, updateData)

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})

		it('should handle unknown error', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(fetch).mockRejectedValueOnce('Unknown error')

			const result = await productApi.updateProduct(1, updateData)

			expect(result).toEqual({
				data: null,
				error: 'Error desconocido al actualizar producto',
			})
		})
	})

	describe('deleteProduct', () => {
		it('should delete product successfully (happy path)', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: undefined }),
			} as Response)

			const result = await productApi.deleteProduct(1)

			expect(result).toEqual({ data: undefined })
			expect(fetch).toHaveBeenCalledWith('/api/products/1', {
				method: 'DELETE',
				credentials: 'include',
			})
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error al eliminar producto',
				}),
			} as Response)

			const result = await productApi.deleteProduct(1)

			expect(result).toEqual({
				data: null,
				error: 'Error al eliminar producto',
			})
		})

		it('should handle network error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await productApi.deleteProduct(1)

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})

		it('should handle unknown error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce('Unknown error')

			const result = await productApi.deleteProduct(1)

			expect(result).toEqual({
				data: null,
				error: 'Error desconocido al eliminar producto',
			})
		})
	})
})
