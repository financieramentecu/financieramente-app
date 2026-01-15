import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCategoryMutations } from '../../hooks/use-category-mutations'
import { categoryApi } from '../../lib/category-api'
import { createMockCategory } from '../fixtures/mock-category'

// Mock categoryApi
vi.mock('../../lib/category-api', () => ({
	categoryApi: {
		createCategory: vi.fn(),
		updateCategory: vi.fn(),
		deleteCategory: vi.fn(),
	},
}))

describe('useCategoryMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('initial state', () => {
		it('should have idle state for all mutations', () => {
			const { result } = renderHook(() => useCategoryMutations())

			expect(result.current.createState.status).toBe('idle')
			expect(result.current.updateState.status).toBe('idle')
			expect(result.current.deleteState.status).toBe('idle')
		})
	})

	describe('createCategory', () => {
		it('should set loading then success on success', async () => {
			const mockCategory = createMockCategory()
			vi.mocked(categoryApi.createCategory).mockResolvedValueOnce({
				data: mockCategory,
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.createCategory({
					code: 'CAT001',
					name: 'Nueva Categoría',
					typeCategory: 'MMS',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockCategory)
			expect(result.current.createState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(categoryApi.createCategory).mockResolvedValueOnce({
				data: null,
				error: 'Error al crear categoría',
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.createCategory({
					code: 'CAT001',
					name: 'Nueva Categoría',
					typeCategory: 'MMS',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Error al crear categoría')
			expect(result.current.createState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			vi.mocked(categoryApi.createCategory).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.createCategory({
					code: 'CAT001',
					name: 'Nueva Categoría',
					typeCategory: 'MMS',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should pass correct data to API', async () => {
			vi.mocked(categoryApi.createCategory).mockResolvedValueOnce({
				data: createMockCategory(),
			})

			const { result } = renderHook(() => useCategoryMutations())

			const data = {
				code: 'CAT001',
				name: 'Nueva Categoría',
				typeCategory: 'MMS' as const,
				descripcion: 'Descripción',
				status: true,
			}

			await act(async () => {
				await result.current.createCategory(data)
			})

			expect(categoryApi.createCategory).toHaveBeenCalledWith(data)
		})
	})

	describe('updateCategory', () => {
		it('should set loading then success on success', async () => {
			const mockCategory = createMockCategory({ name: 'Categoría Actualizada' })
			vi.mocked(categoryApi.updateCategory).mockResolvedValueOnce({
				data: mockCategory,
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.updateCategory(1, {
					name: 'Categoría Actualizada',
				})
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockCategory)
			expect(result.current.updateState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(categoryApi.updateCategory).mockResolvedValueOnce({
				data: null,
				error: 'Error al actualizar categoría',
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.updateCategory(1, { name: 'Test' })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe(
				'Error al actualizar categoría'
			)
			expect(result.current.updateState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			vi.mocked(categoryApi.updateCategory).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.updateCategory(1, { name: 'Test' })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should pass correct data to API', async () => {
			vi.mocked(categoryApi.updateCategory).mockResolvedValueOnce({
				data: createMockCategory(),
			})

			const { result } = renderHook(() => useCategoryMutations())

			const data = { name: 'Categoría Actualizada', status: false }

			await act(async () => {
				await result.current.updateCategory(42, data)
			})

			expect(categoryApi.updateCategory).toHaveBeenCalledWith(42, data)
		})
	})

	describe('deleteCategory', () => {
		it('should set loading then success on success', async () => {
			vi.mocked(categoryApi.deleteCategory).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})

			expect(result.current.deleteState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(categoryApi.deleteCategory).mockResolvedValueOnce({
				data: null,
				error: 'Error al eliminar categoría',
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe(
				'Error al eliminar categoría'
			)
		})

		it('should handle network error', async () => {
			vi.mocked(categoryApi.deleteCategory).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should pass correct ID to API', async () => {
			vi.mocked(categoryApi.deleteCategory).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(42)
			})

			expect(categoryApi.deleteCategory).toHaveBeenCalledWith(42)
		})
	})

	describe('independent state management', () => {
		it('should maintain separate states for each mutation', async () => {
			vi.mocked(categoryApi.createCategory).mockResolvedValueOnce({
				data: createMockCategory(),
			})

			const { result } = renderHook(() => useCategoryMutations())

			await act(async () => {
				await result.current.createCategory({
					code: 'CAT001',
					name: 'Nueva Categoría',
					typeCategory: 'MMS',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			// Other states should remain idle
			expect(result.current.updateState.status).toBe('idle')
			expect(result.current.deleteState.status).toBe('idle')
		})
	})
})
