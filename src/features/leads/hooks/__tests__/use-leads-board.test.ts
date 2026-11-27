import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
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

	it('does not refetch when the window regains focus or the tab becomes visible', async () => {
		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			configurable: true,
		})
		renderHook(() => useLeadsBoard())
		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

		await act(async () => {
			window.dispatchEvent(new Event('focus'))
			document.dispatchEvent(new Event('visibilitychange'))
		})

		expect(mockFetch).toHaveBeenCalledTimes(1)
	})
})

it('serializes associated-only toggle and ignores an older unfiltered response', async () => {
	const filters = getDefaultLeadBoardFilters()
	let resolveOld: (value: unknown) => void = () => {}
	mockFetch.mockReset()
	mockFetch
		.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveOld = resolve
			})
		)
		.mockResolvedValue({ json: async () => ({ data: [] }) })
	const { result, rerender } = renderHook(
		({ associatedOnly }) => useLeadsBoard({ ...filters, associatedOnly }),
		{ initialProps: { associatedOnly: false } }
	)
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
	rerender({ associatedOnly: true })
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
	expect(
		new URL(mockFetch.mock.calls[1][0], 'http://localhost').searchParams.get(
			'associatedOnly'
		)
	).toBe('true')
	await waitFor(() => expect(result.current.state.status).toBe('success'))
	await act(async () => {
		resolveOld({ json: async () => ({ data: [{ idLeadFunnelColumn: 999 }] }) })
	})
	expect(result.current.state).toMatchObject({ status: 'success', data: [] })
})
it('invalidates pending board results and disables manual fetch when hierarchy pauses', async () => {
	let resolveOld: (value: unknown) => void = () => {}
	mockFetch.mockReset()
	mockFetch.mockReturnValue(
		new Promise((resolve) => {
			resolveOld = resolve
		})
	)
	const { result, rerender } = renderHook(
		({ paused }) => useLeadsBoard(undefined, paused),
		{ initialProps: { paused: false } }
	)
	await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
	rerender({ paused: true })
	await act(async () => {
		resolveOld({ json: async () => ({ data: [{ idLeadFunnelColumn: 999 }] }) })
		await result.current.refetch()
	})
	expect(result.current.state.status).not.toBe('success')
	expect(mockFetch).toHaveBeenCalledTimes(1)
})
