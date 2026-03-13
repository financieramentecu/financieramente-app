import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCommissionDiscounts } from '@/features/commission-discounts/hooks/use-commission-discounts'

vi.mock('@/features/commission-discounts/lib/commission-discount-api', () => ({
	getCommissionDiscounts: vi.fn(),
}))

import { getCommissionDiscounts } from '@/features/commission-discounts/lib/commission-discount-api'

const mockGet = vi.mocked(getCommissionDiscounts)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('useCommissionDiscounts', () => {
	it('sets status to success and populates state.data after successful fetch', async () => {
		mockGet.mockResolvedValue([])
		const { result } = renderHook(() => useCommissionDiscounts())
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(result.current.state.data).toEqual([])
	})

	it('sets status to loading before fetch resolves', async () => {
		let resolve: (v: never) => void
		mockGet.mockReturnValue(new Promise((r) => { resolve = r }))
		const { result } = renderHook(() => useCommissionDiscounts())
		expect(result.current.state.status).toBe('loading')
		act(() => resolve([] as never))
		await waitFor(() => expect(result.current.state.status).toBe('success'))
	})

	it('sets status to error and state.error when fetch rejects', async () => {
		mockGet.mockRejectedValue(new Error('Network error'))
		const { result } = renderHook(() => useCommissionDiscounts())
		await waitFor(() => expect(result.current.state.status).toBe('error'))
		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBe('Network error')
		}
	})

	it('refresh re-triggers loading and then settles to success', async () => {
		mockGet.mockResolvedValue([])
		const { result } = renderHook(() => useCommissionDiscounts())
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		act(() => { result.current.refresh() })
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(mockGet).toHaveBeenCalledTimes(2)
	})

	it('exposes a refresh function', async () => {
		mockGet.mockResolvedValue([])
		const { result } = renderHook(() => useCommissionDiscounts())
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(typeof result.current.refresh).toBe('function')
	})
})
