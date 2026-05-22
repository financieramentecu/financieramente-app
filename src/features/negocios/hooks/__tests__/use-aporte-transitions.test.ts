import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAporteTransitions } from '../use-aporte-transitions'

const basePayment = {
	installmentIndex: 1,
	status: 'EN_CARTERA' as const,
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: '2025-05-15T00:00:00.000Z',
	earlyPaymentDate: null,
}

beforeEach(() => {
	vi.restoreAllMocks()
})

describe('useAporteTransitions', () => {
	it('starts in idle state', () => {
		const { result } = renderHook(() => useAporteTransitions())
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle → loading → success on successful fetch', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: basePayment }),
		})

		const { result } = renderHook(() => useAporteTransitions())

		act(() => {
			void result.current.markCartera(10, 1)
		})

		expect(result.current.state.status).toBe('loading')

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.status).toBe('EN_CARTERA')
		}
	})

	it('transitions idle → loading → error on failed fetch', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'INVALID_TRANSITION' }),
		})

		const { result } = renderHook(() => useAporteTransitions())

		act(() => {
			void result.current.unmarkCartera(10, 1)
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBe('INVALID_TRANSITION')
		}
	})

	it('transitions idle → loading → error on network failure', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

		const { result } = renderHook(() => useAporteTransitions())

		act(() => {
			void result.current.markPagoAnticipado(10, 1)
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBe('Network failure')
		}
	})
})
