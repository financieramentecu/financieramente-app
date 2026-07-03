import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFundFirstPayment } from '../use-fund-first-payment'

const mockBusiness = {
	idBusiness: 42,
	status: 'FONDEADO',
	dateAnchored: '2026-07-01T12:00:00.000Z',
}

beforeEach(() => {
	vi.restoreAllMocks()
})

describe('useFundFirstPayment', () => {
	it('starts in idle state', () => {
		const { result } = renderHook(() => useFundFirstPayment(42))
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle → loading → success on successful POST', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: mockBusiness }),
		})

		const { result } = renderHook(() => useFundFirstPayment(42))

		act(() => {
			void result.current.fundFirstPayment('2026-07-01')
		})

		expect(result.current.state.status).toBe('loading')

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data).toEqual(mockBusiness)
		}
	})

	it('transitions idle → loading → error on non-ok response', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'Error al fondear' }),
		})

		const { result } = renderHook(() => useFundFirstPayment(42))

		act(() => {
			void result.current.fundFirstPayment('2026-07-01')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		if (result.current.state.status === 'error') {
			expect(result.current.state.error).toBe('Error al fondear')
		}
	})

	it('transitions idle → loading → error on network failure', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useFundFirstPayment(42))

		act(() => {
			void result.current.fundFirstPayment('2026-07-01')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})
	})

	it('POSTs to correct URL with fundedInstallmentIndexes=[1] and fundedDate', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: mockBusiness }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useFundFirstPayment(42))

		await act(async () => {
			await result.current.fundFirstPayment('2026-07-01')
		})

		expect(mockFetch).toHaveBeenCalledOnce()
		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/negocios/42/fondear-aportes')
		expect(options?.method).toBe('POST')
		const body = JSON.parse(options?.body as string)
		expect(body.fundedInstallmentIndexes).toEqual([1])
		expect(body.fundedDate).toBe('2026-07-01')
	})
})
