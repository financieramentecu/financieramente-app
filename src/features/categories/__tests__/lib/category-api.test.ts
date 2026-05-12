import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryApi } from '../../lib/category-api'
import {
	createMockCategory,
	createMockCategoryListResponse,
} from '../fixtures/mock-category'

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
	apiClient: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}))

import { apiClient } from '@/lib/api/client'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPut = vi.mocked(apiClient.put)
const mockPatch = vi.mocked(apiClient.patch)

describe('category-api', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getCategories', () => {
		it('should fetch categories successfully (happy path)', async () => {
			const mockResponse = createMockCategoryListResponse()
			mockGet.mockResolvedValueOnce({ data: mockResponse })

			const result = await categoryApi.getCategories()

			expect(result.data).toEqual(mockResponse)
			expect('error' in result).toBe(false)
		})

		it('should handle API error (apiClient throws)', async () => {
			mockGet.mockRejectedValueOnce(new Error('Error del servidor'))

			const result = await categoryApi.getCategories()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Error del servidor')
		})

		it('should handle unknown error', async () => {
			mockGet.mockRejectedValueOnce('Unknown error')

			const result = await categoryApi.getCategories()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Error desconocido al obtener categorías'
			)
		})

		it('should pass search params correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockCategoryListResponse(),
			})

			await categoryApi.getCategories({ search: 'test' })

			expect(mockGet).toHaveBeenCalledWith('/categories?search=test')
		})

		it('should pass status filter correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockCategoryListResponse(),
			})

			await categoryApi.getCategories({ status: 'active' })

			expect(mockGet).toHaveBeenCalledWith('/categories?status=active')
		})

		it('should pass pagination params correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockCategoryListResponse(),
			})

			await categoryApi.getCategories({ page: 2, pageSize: 20 })

			expect(mockGet).toHaveBeenCalledWith('/categories?page=2&pageSize=20')
		})

		it('should combine multiple filters correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockCategoryListResponse(),
			})

			await categoryApi.getCategories({
				search: 'test',
				status: 'active',
				page: 1,
				pageSize: 10,
			})

			const url = mockGet.mock.calls[0][0] as string
			expect(url).toContain('search=test')
			expect(url).toContain('status=active')
			expect(url).toContain('page=1')
			expect(url).toContain('pageSize=10')
		})
	})

	describe('getCategory', () => {
		it('should fetch single category successfully (happy path)', async () => {
			const mockCategory = createMockCategory()
			mockGet.mockResolvedValueOnce({ data: mockCategory })

			const result = await categoryApi.getCategory(1)

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (category not found)', async () => {
			mockGet.mockRejectedValueOnce(new Error('Categoría no encontrada'))

			const result = await categoryApi.getCategory(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle network error', async () => {
			mockGet.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.getCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('createCategory', () => {
		it('should create category successfully (happy path)', async () => {
			const mockCategory = createMockCategory()
			mockPost.mockResolvedValueOnce({ data: mockCategory })

			const result = await categoryApi.createCategory({
				name: 'Nueva Categoría',
				idCategoryType: 1,
			})

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle validation error', async () => {
			mockPost.mockRejectedValueOnce(new Error('Datos inválidos'))

			const result = await categoryApi.createCategory({
				name: '',
				idCategoryType: 1,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Datos inválidos')
		})

		it('should handle network error', async () => {
			mockPost.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.createCategory({
				name: 'Nueva Categoría',
				idCategoryType: 1,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should call apiClient.post with correct arguments', async () => {
			mockPost.mockResolvedValueOnce({ data: createMockCategory() })

			const input = {
				name: 'Nueva Categoría',
				idCategoryType: 1,
				description: 'Descripción',
				status: true,
			}

			await categoryApi.createCategory(input)

			expect(mockPost).toHaveBeenCalledWith('/categories', input)
		})
	})

	describe('updateCategory', () => {
		it('should update category successfully (happy path)', async () => {
			const mockCategory = createMockCategory({ name: 'Categoría Actualizada' })
			mockPut.mockResolvedValueOnce({ data: mockCategory })

			const result = await categoryApi.updateCategory(1, {
				name: 'Categoría Actualizada',
			})

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (category not found)', async () => {
			mockPut.mockRejectedValueOnce(new Error('Categoría no encontrada'))

			const result = await categoryApi.updateCategory(999, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle network error', async () => {
			mockPut.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.updateCategory(1, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should call apiClient.put with correct arguments', async () => {
			mockPut.mockResolvedValueOnce({ data: createMockCategory() })

			const input = { name: 'Categoría Actualizada', status: false }

			await categoryApi.updateCategory(1, input)

			expect(mockPut).toHaveBeenCalledWith('/categories/1', input)
		})
	})

	describe('deactivateCategory', () => {
		it('should deactivate category via PATCH successfully (happy path)', async () => {
			const mockCategory = createMockCategory({ status: false })
			mockPatch.mockResolvedValueOnce({ data: mockCategory })

			const result = await categoryApi.deactivateCategory(1)

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
			expect(mockPatch).toHaveBeenCalledWith('/categories/1', { status: false })
		})

		it('should handle 404 error (category not found)', async () => {
			mockPatch.mockRejectedValueOnce(new Error('Categoría no encontrada'))

			const result = await categoryApi.deactivateCategory(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle network error', async () => {
			mockPatch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.deactivateCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should handle unknown error', async () => {
			mockPatch.mockRejectedValueOnce('Unknown error')

			const result = await categoryApi.deactivateCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Error desconocido al desactivar categoría'
			)
		})
	})
})
