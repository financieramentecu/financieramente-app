import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAdminLevels } from '../../hooks/use-admin-levels'
import { createMockLevel, createMockLevelListResponse } from '../fixtures/mock-level'

vi.mock('../../lib/level-api', () => ({
	levelApi: {
		getLevels: vi.fn(),
	},
}))

import { levelApi } from '../../lib/level-api'

const mockGetLevels = vi.mocked(levelApi.getLevels)

describe('useAdminLevels', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return levels on success', async () => {
		const mockLevels = [createMockLevel()]
		mockGetLevels.mockResolvedValueOnce({
			data: createMockLevelListResponse(mockLevels),
		})

		const { result } = renderHook(() => useAdminLevels())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.levels).toEqual(mockLevels)
		expect(result.current.error).toBeNull()
	})

	it('should request pageSize 1000', async () => {
		mockGetLevels.mockResolvedValueOnce({
			data: createMockLevelListResponse([]),
		})

		renderHook(() => useAdminLevels())

		await waitFor(() =>
			expect(mockGetLevels).toHaveBeenCalledWith(
				expect.objectContaining({ pageSize: 1000 })
			)
		)
	})

	it('should pass filters to getLevels', async () => {
		mockGetLevels.mockResolvedValueOnce({
			data: createMockLevelListResponse([]),
		})

		renderHook(() =>
			useAdminLevels({
				search: 'test',
				typeLevel: 'MMS',
				status: 'active',
			})
		)

		await waitFor(() =>
			expect(mockGetLevels).toHaveBeenCalledWith({
				search: 'test',
				typeLevel: 'MMS',
				status: 'active',
				pageSize: 1000,
			})
		)
	})

	it('should handle API error response', async () => {
		mockGetLevels.mockResolvedValueOnce({
			data: null,
			error: 'Error del servidor',
		})

		const { result } = renderHook(() => useAdminLevels())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.levels).toEqual([])
		expect(result.current.error).toBeInstanceOf(Error)
		expect(result.current.error?.message).toBe('Error del servidor')
	})

	it('should handle thrown error', async () => {
		mockGetLevels.mockRejectedValueOnce(new Error('Network error'))

		const { result } = renderHook(() => useAdminLevels())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.levels).toEqual([])
		expect(result.current.error).toBeInstanceOf(Error)
		expect(result.current.error?.message).toBe('Network error')
	})

	it('should refresh levels when refreshLevels is called', async () => {
		mockGetLevels.mockResolvedValueOnce({
			data: createMockLevelListResponse([createMockLevel()]),
		})

		const { result } = renderHook(() => useAdminLevels())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		const updatedLevels = [
			createMockLevel({ idLevel: 2, name: 'Updated' }),
		]
		mockGetLevels.mockResolvedValueOnce({
			data: createMockLevelListResponse(updatedLevels),
		})

		await result.current.refreshLevels()

		await waitFor(() =>
			expect(result.current.levels).toEqual(updatedLevels)
		)
	})
})
