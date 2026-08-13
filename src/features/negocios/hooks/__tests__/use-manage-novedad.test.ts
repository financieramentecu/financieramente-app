import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useManageNovedad } from '../use-manage-novedad'
import { createMockBusiness } from '../../__tests__/fixtures/mock-business'

const updatedEntity = createMockBusiness({
	novedadStatus: 'SOMETIDA_DEVOLUCION',
})

beforeEach(() => {
	vi.restoreAllMocks()
})

describe('useManageNovedad', () => {
	it('starts in idle state', () => {
		const { result } = renderHook(() => useManageNovedad(10))
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle → loading → success on a successful updateStatus()', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: updatedEntity }),
		})

		const { result } = renderHook(() => useManageNovedad(10))

		act(() => {
			void result.current.updateStatus('SOMETIDA_DEVOLUCION')
		})

		expect(result.current.state.status).toBe('loading')

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		if (result.current.state.status === 'success') {
			expect(result.current.state.data.novedadStatus).toBe('SOMETIDA_DEVOLUCION')
		}
	})

	it('transitions idle → loading → error on non-ok response', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ data: null, error: 'No tiene permisos' }),
		})

		const { result } = renderHook(() => useManageNovedad(10))

		act(() => {
			void result.current.updateStatus('CANCELADA')
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

		const { result } = renderHook(() => useManageNovedad(10))

		act(() => {
			void result.current.updateStatus('PENDIENTE')
		})

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})
	})

	it('calls PATCH /api/negocios/:id/manage-novedad with { novedadStatus }', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: updatedEntity }),
		})
		global.fetch = mockFetch

		const { result } = renderHook(() => useManageNovedad(10))

		await act(async () => {
			await result.current.updateStatus('DECLINADA')
		})

		expect(mockFetch).toHaveBeenCalledOnce()
		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/negocios/10/manage-novedad')
		expect(options?.method).toBe('PATCH')
		const body = JSON.parse(options?.body as string)
		expect(body.novedadStatus).toBe('DECLINADA')
	})
})
