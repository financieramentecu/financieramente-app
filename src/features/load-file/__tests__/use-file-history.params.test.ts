import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFileHistory } from '../hooks/use-file-history'
import { loadFileApi } from '../lib/load-file-api'

vi.mock('../lib/load-file-api', () => ({
	loadFileApi: {
		getImportHistory: vi.fn(),
	},
}))

const mockGetImportHistory = vi.mocked(loadFileApi.getImportHistory)

const emptyResponse = {
	data: {
		items: [],
		pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 1 },
	},
}

describe('useFileHistory — filter params forwarded to loadFileApi', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetImportHistory.mockResolvedValue(emptyResponse)
	})

	it('forwards statuses [LOAD, PRE-SETTLED] to getImportHistory (REQ-6)', async () => {
		renderHook(() =>
			useFileHistory({ statuses: ['LOAD', 'PRE-SETTLED'] })
		)

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledWith(1, 100, {
				statuses: ['LOAD', 'PRE-SETTLED'],
			})
		})
	})

	it('forwards { month, year, statuses, search } to getImportHistory as filters', async () => {
		const params = {
			month: 3,
			year: 2026,
			statuses: ['COMPLETED'],
			search: 'foo',
		}

		renderHook(() => useFileHistory(params))

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledWith(
				1,
				100,
				{ month: 3, year: 2026, statuses: ['COMPLETED'], search: 'foo' }
			)
		})
	})

	it('uses page=1 and pageSize=100 as positional args', async () => {
		renderHook(() => useFileHistory({ month: 6 }))

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledWith(
				1,
				100,
				expect.objectContaining({ month: 6 })
			)
		})
	})

	it('re-renders with different params trigger a new getImportHistory call', async () => {
		const { rerender } = renderHook(
			({ month }: { month?: number }) => useFileHistory({ month }),
			{ initialProps: { month: 1 } }
		)

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledTimes(1)
			expect(mockGetImportHistory).toHaveBeenLastCalledWith(
				1,
				100,
				expect.objectContaining({ month: 1 })
			)
		})

		rerender({ month: 5 })

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledTimes(2)
			expect(mockGetImportHistory).toHaveBeenLastCalledWith(
				1,
				100,
				expect.objectContaining({ month: 5 })
			)
		})
	})

	it('calls getImportHistory with empty filters object when no params passed', async () => {
		renderHook(() => useFileHistory())

		await waitFor(() => {
			expect(mockGetImportHistory).toHaveBeenCalledWith(1, 100, {})
		})
	})
})
