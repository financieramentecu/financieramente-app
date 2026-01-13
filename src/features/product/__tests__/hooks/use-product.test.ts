import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProduct } from '../../hooks/use-product'
import { productApi } from '../../lib/product-api'
import { createMockProduct } from '../fixtures/mock-product'

// Mock productApi
vi.mock('../../lib/product-api', () => ({
	productApi: {
		getProduct: vi.fn(),
	},
}))

describe('useProduct', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockProduct = createMockProduct({ idProduct: 1 })
		vi.mocked(productApi.getProduct).mockResolvedValueOnce({
			data: mockProduct,
		})

		const { result } = renderHook(() => useProduct(1))

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch product successfully (happy path)', async () => {
		const mockProduct = createMockProduct({
			idProduct: 1,
			name: 'Seguro de Vida',
		})

		vi.mocked(productApi.getProduct).mockResolvedValueOnce({
			data: mockProduct,
		})

		const { result } = renderHook(() => useProduct(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockProduct)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(productApi.getProduct).mockResolvedValueOnce({
			data: null,
			error: 'Producto no encontrado',
		})

		const { result } = renderHook(() => useProduct(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Producto no encontrado')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(productApi.getProduct).mockRejectedValueOnce(
			new Error('Network error')
		)

		// Suppress console.error for this test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProduct(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(productApi.getProduct).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProduct(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener producto'
		)

		consoleError.mockRestore()
	})

	it('should handle invalid ID', async () => {
		const { result } = renderHook(() => useProduct(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de producto no válido')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should refetch when refetch is called', async () => {
		const mockProduct = createMockProduct({ idProduct: 1 })
		vi.mocked(productApi.getProduct).mockResolvedValue({
			data: mockProduct,
		})

		const { result } = renderHook(() => useProduct(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(productApi.getProduct).toHaveBeenCalledTimes(1)

		await act(async () => {
			await result.current.refetch()
		})

		await waitFor(() => {
			expect(productApi.getProduct).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when id changes', async () => {
		const mockProduct1 = createMockProduct({ idProduct: 1 })
		const mockProduct2 = createMockProduct({ idProduct: 2 })

		vi.mocked(productApi.getProduct)
			.mockResolvedValueOnce({ data: mockProduct1 })
			.mockResolvedValueOnce({ data: mockProduct2 })

		const { result, rerender } = renderHook(
			({ id }: { id: number }) => useProduct(id),
			{
				initialProps: { id: 1 },
			}
		)

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.idProduct).toBe(1)

		rerender({ id: 2 })

		await waitFor(() => {
			expect(result.current.state.data?.idProduct).toBe(2)
		})

		expect(productApi.getProduct).toHaveBeenCalledTimes(2)
		expect(productApi.getProduct).toHaveBeenNthCalledWith(1, 1)
		expect(productApi.getProduct).toHaveBeenNthCalledWith(2, 2)
	})
})
