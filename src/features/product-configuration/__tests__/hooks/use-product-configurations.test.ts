import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductConfigurations } from '../../hooks/use-product-configurations'
import {
	createMockProductConfiguration,
	createMockProductConfigurationListResponse,
} from '../fixtures/mock-product-configuration'

describe('useProductConfigurations', () => {
	const mockFetch = vi.fn()
	global.fetch = mockFetch

	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				data: createMockProductConfigurationListResponse(),
			}),
		})
	})

	it('should start with loading state', async () => {
		// Mock a delayed response to verify loading state
		mockFetch.mockImplementationOnce(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() =>
							resolve({
								ok: true,
								json: async () => ({
									data: createMockProductConfigurationListResponse(),
								}),
							}),
						10
					)
				)
		)

		const { result } = renderHook(() => useProductConfigurations())

		expect(result.current.isLoading).toBe(true)
		expect(result.current.data).toEqual([])

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})
	})

	it('should fetch configurations successfully (happy path)', async () => {
		const mockData = createMockProductConfigurationListResponse([
			createMockProductConfiguration({ id: 1 }),
			createMockProductConfiguration({ id: 2 }),
		])

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: mockData }),
		})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.data).toHaveLength(2)
		expect(result.current.isError).toBe(false)
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/product-configurations')
		)
	})

	it('should handle API error', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: null,
				error: 'Error al obtener configuraciones',
			}),
		})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(result.current.error).toBe('Error al obtener configuraciones')
		expect(result.current.data).toEqual([])
	})

	it('should handle network error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'))
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(result.current.error).toBe('Network error')
		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		const { result } = renderHook(() => useProductConfigurations())

		await act(async () => {
			result.current.setSearch('test')
		})

		await waitFor(() => {
			// First call (initial), Second call (debounced search update)
			// Note: useDebounce default might delay. We might need to advance timers or wait.
			// However, in this mock setup, we just check if it was called eventually with params.
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('search=test')
			)
		})
	})

	it('should pass active filter to API', async () => {
		const { result } = renderHook(() => useProductConfigurations())

		await act(async () => {
			result.current.setActive('active')
		})

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('active=active')
			)
		})
	})

	it('should refetch when reload() is called', async () => {
		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(mockFetch).toHaveBeenCalledTimes(1)

		await act(async () => {
			result.current.reload()
		})

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(2)
		})
	})
})
