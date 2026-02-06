import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductConfigurations } from '../../hooks/use-product-configurations'
import { productConfigurationApi } from '../../lib/product-configuration-api'
import {
	createMockProductConfiguration,
	createMockProductConfigurationListResponse,
} from '../fixtures/mock-product-configuration'

// Mock productConfigurationApi
vi.mock('../../lib/product-configuration-api', () => ({
	productConfigurationApi: {
		getProductConfigurations: vi.fn(),
	},
}))

describe('useProductConfigurations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockResponse =
			createMockProductConfigurationListResponse()
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProductConfigurations())

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch configurations successfully (happy path)', async () => {
		const mockResponse =
			createMockProductConfigurationListResponse([
				createMockProductConfiguration({ id: 1 }),
				createMockProductConfiguration({ id: 2 }),
			])

		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(
			result.current.state.data?.configurations
		).toHaveLength(2)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener configuraciones de producto',
		})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error al obtener configuraciones de producto'
		)
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockRejectedValueOnce(new Error('Network error'))

		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		const mockResponse =
			createMockProductConfigurationListResponse()
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() =>
			useProductConfigurations({
				search: 'test',
				page: 1,
				pageSize: 10,
			})
		)

		await waitFor(() => {
			expect(
				productConfigurationApi.getProductConfigurations
			).toHaveBeenCalledWith({
				search: 'test',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass active filter to API', async () => {
		const mockResponse =
			createMockProductConfigurationListResponse()
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() =>
			useProductConfigurations({ active: 'active' })
		)

		await waitFor(() => {
			expect(
				productConfigurationApi.getProductConfigurations
			).toHaveBeenCalledWith({
				active: 'active',
			})
		})
	})

	it('should refetch when refetch() is called', async () => {
		const mockResponse =
			createMockProductConfigurationListResponse()
		vi.mocked(
			productConfigurationApi.getProductConfigurations
		).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useProductConfigurations())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(
			productConfigurationApi.getProductConfigurations
		).toHaveBeenCalledTimes(1)

		await act(async () => {
			await result.current.refetch()
		})

		await waitFor(() => {
			expect(
				productConfigurationApi.getProductConfigurations
			).toHaveBeenCalledTimes(2)
		})
	})
})
