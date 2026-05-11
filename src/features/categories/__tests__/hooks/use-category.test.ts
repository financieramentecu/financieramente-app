import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCategory } from '../../hooks/use-category'
import { categoryApi } from '../../lib/category-api'
import { createMockCategory } from '../fixtures/mock-category'

// Mock categoryApi
vi.mock('../../lib/category-api', () => ({
	categoryApi: {
		getCategory: vi.fn(),
	},
}))

describe('useCategory', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockCategory = createMockCategory()
		vi.mocked(categoryApi.getCategory).mockResolvedValueOnce({
			data: mockCategory,
		})

		const { result } = renderHook(() => useCategory(1))

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch category successfully (happy path)', async () => {
		const mockCategory = createMockCategory({
			id: 1,
			name: 'Categoría Test',
		})

		vi.mocked(categoryApi.getCategory).mockResolvedValueOnce({
			data: mockCategory,
		})

		const { result } = renderHook(() => useCategory(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockCategory)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error (404)', async () => {
		vi.mocked(categoryApi.getCategory).mockResolvedValueOnce({
			data: null,
			error: 'Categoría no encontrada',
		})

		const { result } = renderHook(() => useCategory(999))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Categoría no encontrada')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(categoryApi.getCategory).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useCategory(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(categoryApi.getCategory).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useCategory(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener categoría'
		)

		consoleError.mockRestore()
	})

	it('should pass correct ID to API', async () => {
		const mockCategory = createMockCategory()
		vi.mocked(categoryApi.getCategory).mockResolvedValueOnce({
			data: mockCategory,
		})

		renderHook(() => useCategory(42))

		await waitFor(() => {
			expect(categoryApi.getCategory).toHaveBeenCalledWith(42)
		})
	})

	it('should update state correctly on success', async () => {
		const mockCategory = createMockCategory({
			id: 5,
			name: 'Categoría Específica',
			idCategoryType: 2,
		})

		vi.mocked(categoryApi.getCategory).mockResolvedValueOnce({
			data: mockCategory,
		})

		const { result } = renderHook(() => useCategory(5))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.id).toBe(5)
		expect(result.current.state.data?.name).toBe('Categoría Específica')
		expect(result.current.state.data?.idCategoryType).toBe(2)
	})

	it('should handle invalid ID (zero)', async () => {
		const { result } = renderHook(() => useCategory(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de categoría inválido')
	})

	it('should handle invalid ID (negative)', async () => {
		const { result } = renderHook(() => useCategory(-1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de categoría inválido')
	})
})
