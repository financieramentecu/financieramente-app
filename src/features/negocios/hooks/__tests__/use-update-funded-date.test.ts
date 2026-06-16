import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUpdateFundedDate } from '../use-update-funded-date'

const fondeadoPayment = {
	installmentIndex: 1,
	status: 'FONDEADO' as const,
	dateAnchored: '2026-06-15T12:00:00.000Z',
	expectedDate: '2026-06-15T00:00:00.000Z',
	portfolioDate: null,
	earlyPaymentDate: null,
	portfolioPaymentDate: null,
}

beforeEach(() => {
	vi.restoreAllMocks()
})

describe('useUpdateFundedDate', () => {
	it('starts in idle state', () => {
		const { result } = renderHook(() => useUpdateFundedDate(10, 1))
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle → loading → success on successful PATCH', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: fondeadoPayment }),
		})

		const { result } = renderHook(() => useUpdateFundedDate(10, 1))

		act(() => {
			void result.current.updateFundedDate('2026-06-15')
		})

		expect(result.current.state.status).toBe('loading')

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.status).toBe('FONDEADO')
		}
	})

	it('transitions idle → loading → error on non-ok response', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'El aporte no está en estado FONDEADO' }),
		})

		const { result } = renderHook(() => useUpdateFundedDate(10, 1))

		act(() => {
			void result.current.updateFundedDate('2026-06-15')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBeTruthy()
		}
	})

	it('transitions idle → loading → error on network failure', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useUpdateFundedDate(10, 1))

		act(() => {
			void result.current.updateFundedDate('2026-06-15')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})
	})

	it('calls PATCH endpoint with correct path and dateAnchored body', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: fondeadoPayment }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useUpdateFundedDate(10, 1))

		await act(async () => {
			await result.current.updateFundedDate('2026-06-15')
		})

		expect(mockFetch).toHaveBeenCalledOnce()
		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/negocios/10/aportes/1/date-anchored')
		expect(options?.method).toBe('PATCH')
		const body = JSON.parse(options?.body as string)
		expect(body.dateAnchored).toBe('2026-06-15')
	})
})
