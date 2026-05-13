import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductMutations } from '../../hooks/use-product-mutations'
import { productApi } from '../../lib/product-api'
import { createMockProduct } from '../fixtures/mock-product'

// Mock productApi
vi.mock('../../lib/product-api', () => ({
	productApi: {
		createProduct: vi.fn(),
		updateProduct: vi.fn(),
		deleteProduct: vi.fn(),
	},
}))

describe('useProductMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createProduct', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductMutations())

			expect(result.current.createState.status).toBe('idle')
			expect(result.current.createState.data).toBeUndefined()
			expect(result.current.createState.error).toBe('')
		})

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

			vi.mocked(productApi.createProduct).mockResolvedValueOnce({
				data: mockProduct,
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.createProduct(createData)
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockProduct)
			expect(result.current.createState.error).toBe('')
			expect(productApi.createProduct).toHaveBeenCalledWith(createData)
		})

		it('should set loading state during creation', async () => {
			const mockProduct = createMockProduct()
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(productApi.createProduct).mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve({ data: mockProduct }), 100)
					})
			)

			const { result } = renderHook(() => useProductMutations())

			act(() => {
				result.current.createProduct(createData)
			})

			expect(result.current.createState.status).toBe('loading')

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})
		})

		it('should handle API error', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(productApi.createProduct).mockResolvedValueOnce({
				data: null,
				error: 'Error al crear producto',
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.createProduct(createData)
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Error al crear producto')
			expect(result.current.createState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(productApi.createProduct).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.createProduct(createData)
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should handle unknown error', async () => {
			const createData = {
				name: 'Nuevo Seguro',
				idCompany: 1,
				status: true,
				commissionPercentage: 0,
				contributionType: 'REGULAR' as const,
			}

			vi.mocked(productApi.createProduct).mockRejectedValueOnce('Unknown error')

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.createProduct(createData)
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe(
				'Error desconocido al crear producto'
			)

			consoleError.mockRestore()
		})
	})

	describe('updateProduct', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductMutations())

			expect(result.current.updateState.status).toBe('idle')
			expect(result.current.updateState.data).toBeUndefined()
			expect(result.current.updateState.error).toBe('')
		})

		it('should update product successfully (happy path)', async () => {
			const mockProduct = createMockProduct({
				idProduct: 1,
				name: 'Seguro Actualizado',
			})
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(productApi.updateProduct).mockResolvedValueOnce({
				data: mockProduct,
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.updateProduct(1, updateData)
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockProduct)
			expect(result.current.updateState.error).toBe('')
			expect(productApi.updateProduct).toHaveBeenCalledWith(1, updateData)
		})

		it('should handle API error', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(productApi.updateProduct).mockResolvedValueOnce({
				data: null,
				error: 'Error al actualizar producto',
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.updateProduct(1, updateData)
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe(
				'Error al actualizar producto'
			)
			expect(result.current.updateState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(productApi.updateProduct).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.updateProduct(1, updateData)
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should handle unknown error', async () => {
			const updateData = {
				name: 'Seguro Actualizado',
			}

			vi.mocked(productApi.updateProduct).mockRejectedValueOnce('Unknown error')

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.updateProduct(1, updateData)
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe(
				'Error desconocido al actualizar producto'
			)

			consoleError.mockRestore()
		})
	})

	describe('deleteProduct', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductMutations())

			expect(result.current.deleteState.status).toBe('idle')
			expect(result.current.deleteState.data).toBeUndefined()
			expect(result.current.deleteState.error).toBe('')
		})

		it('should delete product successfully (happy path)', async () => {
			vi.mocked(productApi.deleteProduct).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.deleteProduct(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})

			expect(result.current.deleteState.error).toBe('')
			expect(productApi.deleteProduct).toHaveBeenCalledWith(1)
		})

		it('should handle API error', async () => {
			vi.mocked(productApi.deleteProduct).mockResolvedValueOnce({
				data: null,
				error: 'Error al eliminar producto',
			})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.deleteProduct(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe(
				'Error al eliminar producto'
			)
			expect(result.current.deleteState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			vi.mocked(productApi.deleteProduct).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.deleteProduct(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should handle unknown error', async () => {
			vi.mocked(productApi.deleteProduct).mockRejectedValueOnce('Unknown error')

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductMutations())

			await act(async () => {
				await result.current.deleteProduct(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe(
				'Error desconocido al eliminar producto'
			)

			consoleError.mockRestore()
		})
	})
})
