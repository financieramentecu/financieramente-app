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
	portfolioPaymentDate: null,
}

const carteraPagadoPayment = {
	installmentIndex: 1,
	status: 'CARTERA_PAGADO' as const,
	dateAnchored: null,
	expectedDate: null,
	portfolioDate: '2025-05-15T00:00:00.000Z',
	earlyPaymentDate: null,
	portfolioPaymentDate: '2025-05-20T00:00:00.000Z',
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
			void result.current.markCartera(10, 1)
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

	it('markCarteraPagado — posts body with paymentDate and transitions to success', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: carteraPagadoPayment }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useAporteTransitions())

		act(() => {
			void result.current.markCarteraPagado(10, 1, '2025-05-20')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/negocios/10/aportes/1/cartera-pagado',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ paymentDate: '2025-05-20' }),
				headers: { 'Content-Type': 'application/json' },
			})
		)

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.status).toBe('CARTERA_PAGADO')
		}
	})

	it('markCarteraPagado — transitions to error on 409 conflict', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'INVALID_TRANSITION' }),
		})

		const { result } = renderHook(() => useAporteTransitions())

		act(() => {
			void result.current.markCarteraPagado(10, 1, '2025-05-20')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBe('INVALID_TRANSITION')
		}
	})
})
