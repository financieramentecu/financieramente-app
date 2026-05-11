import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdminCategories } from '../../hooks/use-admin-categories'
import { createMockCategory, createMockCategoryListResponse } from '../fixtures/mock-category'

vi.mock('../../lib/category-api', () => ({
	categoryApi: {
		getCategories: vi.fn(),
	},
}))

import { categoryApi } from '../../lib/category-api'

const mockGetCategories = vi.mocked(categoryApi.getCategories)

describe('useAdminCategories', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return categories on success', async () => {
		const mockCategories = [createMockCategory()]
		mockGetCategories.mockResolvedValueOnce({
			data: createMockCategoryListResponse(mockCategories),
		})

		const { result } = renderHook(() => useAdminCategories())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.categories).toEqual(mockCategories)
		expect(result.current.error).toBeNull()
	})

	it('should request pageSize 1000', async () => {
		mockGetCategories.mockResolvedValueOnce({
			data: createMockCategoryListResponse([]),
		})

		renderHook(() => useAdminCategories())

		await waitFor(() =>
			expect(mockGetCategories).toHaveBeenCalledWith(
				expect.objectContaining({ pageSize: 1000 })
			)
		)
	})

	it('should pass status filter to getCategories', async () => {
		mockGetCategories.mockResolvedValueOnce({
			data: createMockCategoryListResponse([]),
		})

		renderHook(() =>
			useAdminCategories({
				search: 'test',
				status: 'active',
			})
		)

		await waitFor(() =>
			expect(mockGetCategories).toHaveBeenCalledWith({
				search: 'test',
				status: 'active',
				pageSize: 1000,
			})
		)
	})

	it('should handle API error response', async () => {
		mockGetCategories.mockResolvedValueOnce({
			data: null,
			error: 'Error del servidor',
		})

		const { result } = renderHook(() => useAdminCategories())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.categories).toEqual([])
		expect(result.current.error).toBeInstanceOf(Error)
		expect(result.current.error?.message).toBe('Error del servidor')
	})

	it('should handle thrown error', async () => {
		mockGetCategories.mockRejectedValueOnce(new Error('Network error'))

		const { result } = renderHook(() => useAdminCategories())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.categories).toEqual([])
		expect(result.current.error).toBeInstanceOf(Error)
		expect(result.current.error?.message).toBe('Network error')
	})

	it('should refresh categories when refreshCategories is called', async () => {
		mockGetCategories.mockResolvedValueOnce({
			data: createMockCategoryListResponse([createMockCategory()]),
		})

		const { result } = renderHook(() => useAdminCategories())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		const updatedCategories = [
			createMockCategory({ id: 2, name: 'Updated' }),
		]
		mockGetCategories.mockResolvedValueOnce({
			data: createMockCategoryListResponse(updatedCategories),
		})

		await result.current.refreshCategories()

		await waitFor(() =>
			expect(result.current.categories).toEqual(updatedCategories)
		)
	})
})
