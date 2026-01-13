import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProducts } from '../../hooks/use-products'
import { productApi } from '../../lib/product-api'
import {
	createMockProduct,
	createMockProductListResponse,
} from '../fixtures/mock-product'

// Mock productApi
vi.mock('../../lib/product-api', () => ({
	productApi: {
		getProducts: vi.fn(),
	},
}))

describe('useProducts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProducts())

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch products successfully (happy path)', async () => {
		const mockResponse = createMockProductListResponse([
			createMockProduct({ idProduct: 1, name: 'Seguro de Vida' }),
			createMockProduct({ idProduct: 2, name: 'Seguro de Salud' }),
		])

		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProducts())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.data?.products).toHaveLength(2)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener productos',
		})

		const { result } = renderHook(() => useProducts())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Error al obtener productos')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(productApi.getProducts).mockRejectedValueOnce(
			new Error('Network error')
		)

		// Suppress console.error for this test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProducts())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(productApi.getProducts).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProducts())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener productos'
		)

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useProducts({ search: 'Seguro', page: 1, pageSize: 10 }))

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({
				search: 'Seguro',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass status filter to API', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useProducts({ status: 'active' }))

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({
				status: 'active',
			})
		})
	})

	it('should pass idCompany filter to API', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useProducts({ idCompany: 1 }))

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({
				idCompany: 1,
			})
		})
	})

	it('should refetch when refetch is called', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProducts())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(productApi.getProducts).toHaveBeenCalledTimes(1)

		await act(async () => {
			await result.current.refetch()
		})

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when params change', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValue({
			data: mockResponse,
		})

		const { rerender } = renderHook(
			({ search }: { search?: string }) => useProducts({ search }),
			{
				initialProps: { search: 'Seguro' },
			}
		)

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({
				search: 'Seguro',
			})
		})

		rerender({ search: 'Salud' })

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({
				search: 'Salud',
			})
		})
	})

	it('should handle empty params', async () => {
		const mockResponse = createMockProductListResponse()
		vi.mocked(productApi.getProducts).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useProducts({}))

		await waitFor(() => {
			expect(productApi.getProducts).toHaveBeenCalledWith({})
		})
	})
})
