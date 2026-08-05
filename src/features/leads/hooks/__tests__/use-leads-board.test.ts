import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLeadsBoard } from '@/features/leads/hooks/use-leads-board'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useLeadsBoard — refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockResolvedValue({
			json: async () => ({ data: [] }),
		})
	})

	it('fetches once on mount', async () => {
		renderHook(() => useLeadsBoard())

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1)
		})
	})

	it('exposes a refetch function that triggers a new fetch', async () => {
		const { result } = renderHook(() => useLeadsBoard())

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		await act(async () => {
			await result.current.refetch()
		})

		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it('refetches when the window regains focus', async () => {
		renderHook(() => useLeadsBoard())
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		await act(async () => {
			window.dispatchEvent(new Event('focus'))
		})

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
	})

	it('refetches when the tab becomes visible again', async () => {
		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			configurable: true,
		})
		renderHook(() => useLeadsBoard())
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		await act(async () => {
			document.dispatchEvent(new Event('visibilitychange'))
		})

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
	})

	it('does not refetch on visibilitychange while the tab is hidden', async () => {
		renderHook(() => useLeadsBoard())
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		Object.defineProperty(document, 'visibilityState', {
			value: 'hidden',
			configurable: true,
		})
		await act(async () => {
			document.dispatchEvent(new Event('visibilitychange'))
		})

		expect(mockFetch).toHaveBeenCalledTimes(1)
	})
})
