import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryApi } from '../../lib/category-api'
import {
	createMockCategory,
	createMockCategoryListResponse,
} from '../fixtures/mock-category'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('category-api', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getCategories', () => {
		it('should fetch categories successfully (happy path)', async () => {
			const mockResponse = createMockCategoryListResponse()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			})

			const result = await categoryApi.getCategories()

			expect(result.data).toEqual(mockResponse)
			expect('error' in result).toBe(false)
		})

		it('should handle API error response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Error del servidor' }),
			})

			const result = await categoryApi.getCategories()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Error del servidor')
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.getCategories()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should handle unknown error', async () => {
			mockFetch.mockRejectedValueOnce('Unknown error')

			const result = await categoryApi.getCategories()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Error desconocido al obtener categorías'
			)
		})

		it('should pass search params correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategoryListResponse() }),
			})

			await categoryApi.getCategories({ search: 'test' })

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/categories?search=test',
				expect.any(Object)
			)
		})

		it('should pass typeCategory filter correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategoryListResponse() }),
			})

			await categoryApi.getCategories({ typeCategory: 'MMS' })

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/categories?typeCategory=MMS',
				expect.any(Object)
			)
		})

		it('should pass status filter correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategoryListResponse() }),
			})

			await categoryApi.getCategories({ status: 'active' })

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/categories?status=active',
				expect.any(Object)
			)
		})

		it('should pass pagination params correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategoryListResponse() }),
			})

			await categoryApi.getCategories({ page: 2, pageSize: 20 })

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/categories?page=2&pageSize=20',
				expect.any(Object)
			)
		})

		it('should combine multiple filters correctly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategoryListResponse() }),
			})

			await categoryApi.getCategories({
				search: 'test',
				typeCategory: 'MMS',
				status: 'active',
				page: 1,
				pageSize: 10,
			})

			const url = mockFetch.mock.calls[0][0] as string
			expect(url).toContain('search=test')
			expect(url).toContain('typeCategory=MMS')
			expect(url).toContain('status=active')
			expect(url).toContain('page=1')
			expect(url).toContain('pageSize=10')
		})
	})

	describe('getCategory', () => {
		it('should fetch single category successfully (happy path)', async () => {
			const mockCategory = createMockCategory()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockCategory }),
			})

			const result = await categoryApi.getCategory(1)

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (category not found)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Categoría no encontrada' }),
			})

			const result = await categoryApi.getCategory(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.getCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('createCategory', () => {
		it('should create category successfully (happy path)', async () => {
			const mockCategory = createMockCategory()
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockCategory }),
			})

			const result = await categoryApi.createCategory({
				code: 'CAT001',
				name: 'Nueva Categoría',
				typeCategory: 'MMS',
				status: true,
			})

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle validation error (Zod)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Datos inválidos' }),
			})

			const result = await categoryApi.createCategory({
				code: '',
				name: 'A',
				typeCategory: 'MMS',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Datos inválidos')
		})

		it('should handle duplicate code error (409)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Ya existe una categoría con este código',
				}),
			})

			const result = await categoryApi.createCategory({
				code: 'CAT001',
				name: 'Categoría',
				typeCategory: 'MMS',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Ya existe una categoría con este código'
			)
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.createCategory({
				code: 'CAT001',
				name: 'Nueva Categoría',
				typeCategory: 'MMS',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should send correct request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategory() }),
			})

			const data = {
				code: 'CAT001',
				name: 'Nueva Categoría',
				typeCategory: 'MMS' as const,
				descripcion: 'Descripción',
				status: true,
			}

			await categoryApi.createCategory(data)

			expect(mockFetch).toHaveBeenCalledWith('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
		})
	})

	describe('updateCategory', () => {
		it('should update category successfully (happy path)', async () => {
			const mockCategory = createMockCategory({ name: 'Categoría Actualizada' })
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockCategory }),
			})

			const result = await categoryApi.updateCategory(1, {
				name: 'Categoría Actualizada',
			})

			expect(result.data).toEqual(mockCategory)
			expect('error' in result).toBe(false)
		})

		it('should handle validation error (Zod)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Datos inválidos' }),
			})

			const result = await categoryApi.updateCategory(1, { name: 'A' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Datos inválidos')
		})

		it('should handle 404 error (category not found)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Categoría no encontrada' }),
			})

			const result = await categoryApi.updateCategory(999, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle duplicate code error (409)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Ya existe una categoría con este código',
				}),
			})

			const result = await categoryApi.updateCategory(1, { code: 'CAT002' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Ya existe una categoría con este código'
			)
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.updateCategory(1, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should send correct request body', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: createMockCategory() }),
			})

			const data = { name: 'Categoría Actualizada', status: false }

			await categoryApi.updateCategory(1, data)

			expect(mockFetch).toHaveBeenCalledWith('/api/categories/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
				credentials: 'include',
			})
		})
	})

	describe('deleteCategory', () => {
		it('should delete category successfully (happy path)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: undefined }),
			})

			const result = await categoryApi.deleteCategory(1)

			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (category not found)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ data: null, error: 'Categoría no encontrada' }),
			})

			const result = await categoryApi.deleteCategory(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Categoría no encontrada')
		})

		it('should handle foreign key constraint error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'No se puede eliminar la categoría porque tiene usuarios asignados',
				}),
			})

			const result = await categoryApi.deleteCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'No se puede eliminar la categoría porque tiene usuarios asignados'
			)
		})

		it('should handle network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await categoryApi.deleteCategory(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})
})
