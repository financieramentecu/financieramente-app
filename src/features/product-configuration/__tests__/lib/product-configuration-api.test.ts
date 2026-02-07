import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productConfigurationApi } from '../../lib/product-configuration-api'
import {
	createMockProductConfiguration,
	createMockProductConfigurationListResponse,
} from '../fixtures/mock-product-configuration'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('product-configuration-api', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getProductConfigurations', () => {
		it('should fetch configurations successfully (happy path)', async () => {
			const mockResponse = createMockProductConfigurationListResponse()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			})

			const result = await productConfigurationApi.getProductConfigurations()

			expect(result.data).toEqual(mockResponse)
			expect('error' in result).toBe(false)
		})

		it('should handle API error response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error del servidor',
				}),
			})

			const result = await productConfigurationApi.getProductConfigurations()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Error del servidor')
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await productConfigurationApi.getProductConfigurations()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should pass search params correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfigurationListResponse(),
				}),
			})

			await productConfigurationApi.getProductConfigurations({
				search: 'test',
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/product-configurations?search=test',
				expect.any(Object)
			)
		})

		it('should pass active filter correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfigurationListResponse(),
				}),
			})

			await productConfigurationApi.getProductConfigurations({
				active: 'active',
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/product-configurations?active=active',
				expect.any(Object)
			)
		})

		it('should pass pagination params correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfigurationListResponse(),
				}),
			})

			await productConfigurationApi.getProductConfigurations({
				page: 2,
				pageSize: 20,
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/product-configurations?page=2&pageSize=20',
				expect.any(Object)
			)
		})

		it('should combine multiple filters correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfigurationListResponse(),
				}),
			})

			await productConfigurationApi.getProductConfigurations({
				search: 'test',
				active: 'active',
				page: 1,
				pageSize: 10,
			})

			const url = mockFetch.mock.calls[0][0] as string
			expect(url).toContain('search=test')
			expect(url).toContain('active=active')
			expect(url).toContain('page=1')
			expect(url).toContain('pageSize=10')
		})
	})

	describe('getProductConfiguration', () => {
		it('should fetch single configuration successfully', async () => {
			const mockConfig = createMockProductConfiguration()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockConfig }),
			})

			const result = await productConfigurationApi.getProductConfiguration(1)

			expect(result.data).toEqual(mockConfig)
			expect('error' in result).toBe(false)
		})

		it('should handle 404 error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Configuración de producto no encontrada',
				}),
			})

			const result = await productConfigurationApi.getProductConfiguration(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Configuración de producto no encontrada'
			)
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await productConfigurationApi.getProductConfiguration(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('createProductConfiguration', () => {
		it('should create configuration successfully', async () => {
			const mockConfig = createMockProductConfiguration()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockConfig }),
			})

			const result = await productConfigurationApi.createProductConfiguration({
				idProduct: 1,
				idClientOrigin: 1,
				idCategory: 1,
				idCompany: 1,
			})

			expect(result.data).toEqual(mockConfig)
			expect('error' in result).toBe(false)
		})

		it('should handle duplicate error (409)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Ya existe una configuración con esta combinación',
				}),
			})

			const result = await productConfigurationApi.createProductConfiguration({
				idProduct: 1,
				idClientOrigin: 1,
				idCategory: 1,
				idCompany: 1,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Ya existe una configuración con esta combinación'
			)
		})

		it('should send correct request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfiguration(),
				}),
			})

			const data = {
				idProduct: 1,
				idClientOrigin: 2,
				idCategory: 3,
				idCompany: 1,
			}

			await productConfigurationApi.createProductConfiguration(data)

			expect(mockFetch).toHaveBeenCalledWith('/api/product-configurations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await productConfigurationApi.createProductConfiguration({
				idProduct: 1,
				idClientOrigin: 1,
				idCategory: 1,
				idCompany: 1,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('updateProductConfiguration', () => {
		it('should update configuration successfully', async () => {
			const mockConfig = createMockProductConfiguration()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockConfig }),
			})

			const result = await productConfigurationApi.updateProductConfiguration(
				1,
				{
					idProductPercentajeCommisionNewBusinesses: 5,
				}
			)

			expect(result.data).toEqual(mockConfig)
			expect('error' in result).toBe(false)
		})

		it('should send correct request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfiguration(),
				}),
			})

			const data = {
				idProductPercentajeCommisionNewBusinesses: 5,
			}

			await productConfigurationApi.updateProductConfiguration(1, data)

			expect(mockFetch).toHaveBeenCalledWith('/api/product-configurations/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await productConfigurationApi.updateProductConfiguration(
				1,
				{
					idProductPercentajeCommisionNewBusinesses: 5,
				}
			)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('toggleActive', () => {
		it('should toggle active successfully', async () => {
			const mockConfig = createMockProductConfiguration({
				active: false,
			})
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockConfig }),
			})

			const result = await productConfigurationApi.toggleActive(1, false)

			expect(result.data).toEqual(mockConfig)
			expect('error' in result).toBe(false)
		})

		it('should send correct request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: createMockProductConfiguration(),
				}),
			})

			await productConfigurationApi.toggleActive(1, false)

			expect(mockFetch).toHaveBeenCalledWith('/api/product-configurations/1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: false }),
				credentials: 'include',
			})
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await productConfigurationApi.toggleActive(1, true)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})
})
