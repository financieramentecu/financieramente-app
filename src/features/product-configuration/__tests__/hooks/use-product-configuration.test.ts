import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductConfiguration } from '../../hooks/use-product-configuration'
import { productConfigurationApi } from '../../lib/product-configuration-api'
import { createMockProductConfiguration } from '../fixtures/mock-product-configuration'

// Mock productConfigurationApi
vi.mock('../../lib/product-configuration-api', () => ({
	productConfigurationApi: {
		getProductConfiguration: vi.fn(),
	},
}))

describe('useProductConfiguration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockConfig = createMockProductConfiguration()
		vi.mocked(
			productConfigurationApi.getProductConfiguration
		).mockResolvedValueOnce({
			data: mockConfig,
		})

		const { result } = renderHook(() => useProductConfiguration(1))

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch configuration successfully (happy path)', async () => {
		const mockConfig = createMockProductConfiguration()
		vi.mocked(
			productConfigurationApi.getProductConfiguration
		).mockResolvedValueOnce({
			data: mockConfig,
		})

		const { result } = renderHook(() => useProductConfiguration(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockConfig)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(
			productConfigurationApi.getProductConfiguration
		).mockResolvedValueOnce({
			data: null,
			error: 'Configuración de producto no encontrada',
		})

		const { result } = renderHook(() => useProductConfiguration(999))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Configuración de producto no encontrada'
		)
	})

	it('should handle network error', async () => {
		vi.mocked(
			productConfigurationApi.getProductConfiguration
		).mockRejectedValueOnce(new Error('Network error'))

		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const { result } = renderHook(() => useProductConfiguration(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')

		consoleError.mockRestore()
	})

	it('should set error for invalid id (zero)', async () => {
		const { result } = renderHook(() => useProductConfiguration(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'ID de configuración de producto inválido'
		)
	})

	it('should set error for negative id', async () => {
		const { result } = renderHook(() => useProductConfiguration(-1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'ID de configuración de producto inválido'
		)
	})
})
