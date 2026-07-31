import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMarkNovedad } from '../use-mark-novedad'
import { createMockBusiness } from '../../__tests__/fixtures/mock-business'

const markedEntity = createMockBusiness({
	novedadStatus: 'PENDIENTE',
	novedadMarkedAt: '2026-07-30T12:00:00.000Z',
})

const unmarkedEntity = createMockBusiness({
	novedadStatus: null,
	novedadMarkedAt: null,
})

beforeEach(() => {
	vi.restoreAllMocks()
})

describe('useMarkNovedad', () => {
	it('starts in idle state', () => {
		const { result } = renderHook(() => useMarkNovedad(10))
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle → loading → success on successful mark()', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: markedEntity }),
		})

		const { result } = renderHook(() => useMarkNovedad(10))

		act(() => {
			void result.current.mark()
		})

		expect(result.current.state.status).toBe('loading')

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.novedadStatus).toBe('PENDIENTE')
		}
	})

	it('transitions idle → loading → success on successful unmark()', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: unmarkedEntity }),
		})

		const { result } = renderHook(() => useMarkNovedad(10))

		act(() => {
			void result.current.unmark()
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.novedadStatus).toBeNull()
		}
	})

	it('transitions idle → loading → error on non-ok response', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'El negocio no está en Venta Efectuada' }),
		})

		const { result } = renderHook(() => useMarkNovedad(10))

		act(() => {
			void result.current.mark()
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

		const { result } = renderHook(() => useMarkNovedad(10))

		act(() => {
			void result.current.unmark()
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})
	})

	it('calls PATCH endpoint with action MARK', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: markedEntity }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useMarkNovedad(10))

		await act(async () => {
			await result.current.mark()
		})

		expect(mockFetch).toHaveBeenCalledOnce()
		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/negocios/10/mark-novedad')
		expect(options?.method).toBe('PATCH')
		const body = JSON.parse(options?.body as string)
		expect(body.action).toBe('MARK')
	})

	it('calls PATCH endpoint with action UNMARK', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: unmarkedEntity }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useMarkNovedad(10))

		await act(async () => {
			await result.current.unmark()
		})

		const [, options] = mockFetch.mock.calls[0]
		const body = JSON.parse(options?.body as string)
		expect(body.action).toBe('UNMARK')
	})
})
