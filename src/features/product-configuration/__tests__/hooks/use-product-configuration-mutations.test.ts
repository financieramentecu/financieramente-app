import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProductConfigurationMutations } from '../../hooks/use-product-configuration-mutations'
import { productConfigurationApi } from '../../lib/product-configuration-api'
import type { ProductConfiguration } from '../../types/product-configuration.types'
import { createMockProductConfiguration } from '../fixtures/mock-product-configuration'

// Mock productConfigurationApi
vi.mock('../../lib/product-configuration-api', () => ({
	productConfigurationApi: {
		createProductConfiguration: vi.fn(),
		updateProductConfiguration: vi.fn(),
		toggleActive: vi.fn(),
	},
}))

describe('useProductConfigurationMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createProductConfiguration', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductConfigurationMutations())

			expect(result.current.createState.status).toBe('idle')
			expect(result.current.createState.data).toBeUndefined()
			expect(result.current.createState.error).toBe('')
		})

		it('should create configuration successfully', async () => {
			const mockConfig = createMockProductConfiguration()
			vi.mocked(
				productConfigurationApi.createProductConfiguration
			).mockResolvedValueOnce({
				data: mockConfig,
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			let created: ProductConfiguration | null = null

			await act(async () => {
				created = await result.current.createProductConfiguration({
					idProduct: 1,
					idCategory: 1,
					idCompany: 1,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockConfig)
			expect(created).toEqual(mockConfig)
		})

		it('should handle API error', async () => {
			vi.mocked(
				productConfigurationApi.createProductConfiguration
			).mockResolvedValueOnce({
				data: null,
				error: 'Ya existe una configuración con esta combinación',
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.createProductConfiguration({
					idProduct: 1,
					idCategory: 1,
					idCompany: 1,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe(
				'Ya existe una configuración con esta combinación'
			)
		})

		it('should handle network error', async () => {
			vi.mocked(
				productConfigurationApi.createProductConfiguration
			).mockRejectedValueOnce(new Error('Network error'))

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.createProductConfiguration({
					idProduct: 1,
					idCategory: 1,
					idCompany: 1,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Network error')

			consoleError.mockRestore()
		})
	})

	describe('updateProductConfiguration', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductConfigurationMutations())

			expect(result.current.updateState.status).toBe('idle')
		})

		it('should update configuration successfully', async () => {
			const mockConfig = createMockProductConfiguration()
			vi.mocked(
				productConfigurationApi.updateProductConfiguration
			).mockResolvedValueOnce({
				data: mockConfig,
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.updateProductConfiguration(1, {
					idProductPercentageCommissionNewBusinesses: 5,
				})
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockConfig)
		})

		it('should handle API error', async () => {
			vi.mocked(
				productConfigurationApi.updateProductConfiguration
			).mockResolvedValueOnce({
				data: null,
				error: 'La comisión no pertenece a esta configuración',
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.updateProductConfiguration(1, {
					idProductPercentageCommissionNewBusinesses: 5,
				})
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe(
				'La comisión no pertenece a esta configuración'
			)
		})
	})

	describe('toggleActive', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useProductConfigurationMutations())

			expect(result.current.toggleActiveState.status).toBe('idle')
		})

		it('should toggle active successfully', async () => {
			const mockConfig = createMockProductConfiguration({
				active: false,
			})
			vi.mocked(productConfigurationApi.toggleActive).mockResolvedValueOnce({
				data: mockConfig,
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.toggleActive(1, false)
			})

			await waitFor(() => {
				expect(result.current.toggleActiveState.status).toBe('success')
			})

			expect(result.current.toggleActiveState.data).toEqual(mockConfig)
		})

		it('should handle API error', async () => {
			vi.mocked(productConfigurationApi.toggleActive).mockResolvedValueOnce({
				data: null,
				error: 'Error al cambiar estado',
			})

			const { result } = renderHook(() => useProductConfigurationMutations())

			await act(async () => {
				await result.current.toggleActive(1, false)
			})

			await waitFor(() => {
				expect(result.current.toggleActiveState.status).toBe('error')
			})

			expect(result.current.toggleActiveState.error).toBe(
				'Error al cambiar estado'
			)
		})
	})

	it('should maintain independent states for each mutation', async () => {
		const mockConfig = createMockProductConfiguration()
		vi.mocked(
			productConfigurationApi.createProductConfiguration
		).mockResolvedValueOnce({
			data: mockConfig,
		})

		const { result } = renderHook(() => useProductConfigurationMutations())

		await act(async () => {
			await result.current.createProductConfiguration({
				idProduct: 1,
				idCategory: 1,
				idCompany: 1,
			})
		})

		await waitFor(() => {
			expect(result.current.createState.status).toBe('success')
		})

		// Other states should remain idle
		expect(result.current.updateState.status).toBe('idle')
		expect(result.current.toggleActiveState.status).toBe('idle')
	})
})
