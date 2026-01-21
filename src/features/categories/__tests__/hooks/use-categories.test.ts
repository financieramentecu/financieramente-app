import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCategories } from '../../hooks/use-categories'
import { categoryApi } from '../../lib/category-api'
import {
	createMockCategory,
	createMockCategoryListResponse,
} from '../fixtures/mock-category'

// Mock categoryApi
vi.mock('../../lib/category-api', () => ({
	categoryApi: {
		getCategories: vi.fn(),
	},
}))

describe('useCategories', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCategories())

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch categories successfully (happy path)', async () => {
		const mockResponse = createMockCategoryListResponse([
			createMockCategory({ idCategory: 1, name: 'Agente MMS' }),
			createMockCategory({ idCategory: 2, name: 'Agente Aliado' }),
		])

		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.data?.categories).toHaveLength(2)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener categorías',
		})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Error al obtener categorías')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(categoryApi.getCategories).mockRejectedValueOnce(
			new Error('Network error')
		)

		// Suppress console.error for this test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(categoryApi.getCategories).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener categorías'
		)

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() =>
			useCategories({ search: 'Agente', page: 1, pageSize: 10 })
		)

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				search: 'Agente',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass typeCategory filter to API', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useCategories({ typeCategory: 'MMS' }))

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				typeCategory: 'MMS',
			})
		})
	})

	it('should pass status filter to API', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useCategories({ status: 'active' }))

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				status: 'active',
			})
		})
	})

	it('should pass pagination params to API', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useCategories({ page: 2, pageSize: 20 }))

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				page: 2,
				pageSize: 20,
			})
		})
	})

	it('should refetch when refetch() is called', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(categoryApi.getCategories).toHaveBeenCalledTimes(1)

		await act(async () => {
			await result.current.refetch()
		})

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when params change', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValue({
			data: mockResponse,
		})

		const { rerender } = renderHook(
			({ search }: { search?: string }) => useCategories({ search }),
			{
				initialProps: { search: 'Agente' },
			}
		)

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				search: 'Agente',
			})
		})

		rerender({ search: 'MMS' })

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({
				search: 'MMS',
			})
		})
	})

	it('should handle empty params', async () => {
		const mockResponse = createMockCategoryListResponse()
		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useCategories({}))

		await waitFor(() => {
			expect(categoryApi.getCategories).toHaveBeenCalledWith({})
		})
	})

	it('should update state correctly on success', async () => {
		const mockCategories = [
			createMockCategory({ idCategory: 1, name: 'Cat 1' }),
			createMockCategory({ idCategory: 2, name: 'Cat 2' }),
		]
		const mockResponse = createMockCategoryListResponse(mockCategories)

		vi.mocked(categoryApi.getCategories).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCategories())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.categories).toHaveLength(2)
		expect(result.current.state.data?.pagination.total).toBe(2)
		expect(result.current.state.error).toBe('')
	})
})
