import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminCategoryMutations } from '../../hooks/use-admin-category-mutations'
import { createMockCategory } from '../fixtures/mock-category'

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

vi.mock('../../lib/category-api', () => ({
	categoryApi: {
		createCategory: vi.fn(),
		updateCategory: vi.fn(),
		deactivateCategory: vi.fn(),
	},
}))

import { toast } from 'sonner'
import { categoryApi } from '../../lib/category-api'

const mockCreateCategory = vi.mocked(categoryApi.createCategory)
const mockUpdateCategory = vi.mocked(categoryApi.updateCategory)
const mockDeactivateCategory = vi.mocked(categoryApi.deactivateCategory)

describe('useAdminCategoryMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createCategory', () => {
		it('should create category and show success toast', async () => {
			const mockCategory = createMockCategory()
			mockCreateCategory.mockResolvedValueOnce({ data: mockCategory })

			const { result } = renderHook(() => useAdminCategoryMutations())

			await act(async () => {
				await result.current.createCategory({
					code: 'CAT001',
					name: 'Test',
					typeCategory: 'MMS',
					status: true,
				})
			})

			expect(toast.success).toHaveBeenCalledWith('Categoría creada exitosamente')
			expect(result.current.isSubmitting).toBe(false)
		})

		it('should handle API error response and show error toast', async () => {
			mockCreateCategory.mockResolvedValueOnce({
				data: null,
				error: 'Datos inválidos',
			})

			const { result } = renderHook(() => useAdminCategoryMutations())

			await expect(
				act(async () => {
					await result.current.createCategory({
						code: '',
						name: 'A',
						typeCategory: 'MMS',
						status: true,
					})
				})
			).rejects.toThrow('Datos inválidos')

			expect(toast.error).toHaveBeenCalledWith('Error al crear categoría', {
				description: 'Datos inválidos',
			})
		})
	})

	describe('updateCategory', () => {
		it('should update category and show success toast', async () => {
			const mockCategory = createMockCategory({ name: 'Updated' })
			mockUpdateCategory.mockResolvedValueOnce({ data: mockCategory })

			const { result } = renderHook(() => useAdminCategoryMutations())

			await act(async () => {
				await result.current.updateCategory(1, { name: 'Updated' })
			})

			expect(toast.success).toHaveBeenCalledWith(
				'Categoría actualizada exitosamente'
			)
		})

		it('should handle API error response and show error toast', async () => {
			mockUpdateCategory.mockResolvedValueOnce({
				data: null,
				error: 'Categoría no encontrada',
			})

			const { result } = renderHook(() => useAdminCategoryMutations())

			await expect(
				act(async () => {
					await result.current.updateCategory(999, { name: 'Test' })
				})
			).rejects.toThrow('Categoría no encontrada')

			expect(toast.error).toHaveBeenCalledWith(
				'Error al actualizar categoría',
				{ description: 'Categoría no encontrada' }
			)
		})
	})

	describe('deleteCategory', () => {
		it('should call deactivateCategory (soft delete) and show success toast', async () => {
			const mockCategory = createMockCategory({ status: false })
			mockDeactivateCategory.mockResolvedValueOnce({ data: mockCategory })

			const { result } = renderHook(() => useAdminCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(1)
			})

			expect(mockDeactivateCategory).toHaveBeenCalledWith(1)
			expect(toast.success).toHaveBeenCalledWith(
				'Categoría desactivada exitosamente'
			)
		})

		it('should NOT call categoryApi.deleteCategory (hard delete)', async () => {
			const mockCategory = createMockCategory({ status: false })
			mockDeactivateCategory.mockResolvedValueOnce({ data: mockCategory })

			const { result } = renderHook(() => useAdminCategoryMutations())

			await act(async () => {
				await result.current.deleteCategory(1)
			})

			expect(mockDeactivateCategory).toHaveBeenCalledWith(1)
		})

		it('should handle API error response and show error toast', async () => {
			mockDeactivateCategory.mockResolvedValueOnce({
				data: null,
				error: 'Categoría no encontrada',
			})

			const { result } = renderHook(() => useAdminCategoryMutations())

			await expect(
				act(async () => {
					await result.current.deleteCategory(999)
				})
			).rejects.toThrow('Categoría no encontrada')

			expect(toast.error).toHaveBeenCalledWith(
				'Error al desactivar categoría',
				{ description: 'Categoría no encontrada' }
			)
		})
	})
})
