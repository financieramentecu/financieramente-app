import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeleteLead } from '@/features/leads/hooks/use-delete-lead'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useDeleteLead', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('starts idle', () => {
		const { result } = renderHook(() => useDeleteLead())
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle -> loading -> success on a 200 response', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ data: { idLead: 1 } }),
		})

		const { result } = renderHook(() => useDeleteLead())

		await act(async () => {
			await result.current.deleteLead(1)
		})

		await waitFor(() =>
			expect(result.current.state.status).toBe('success')
		)
		expect(result.current.state.data).toEqual({ idLead: 1 })
		expect(mockFetch).toHaveBeenCalledWith('/api/leads/1', {
			method: 'DELETE',
		})
	})

	it('transitions idle -> loading -> error on a non-2xx response', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			json: async () => ({ data: null, error: 'Este lead no se puede eliminar' }),
		})

		const { result } = renderHook(() => useDeleteLead())

		await act(async () => {
			await result.current.deleteLead(1)
		})

		await waitFor(() => expect(result.current.state.status).toBe('error'))
		expect(result.current.state.error).toBe('Este lead no se puede eliminar')
	})

	it('transitions idle -> loading -> error on a network failure', async () => {
		mockFetch.mockRejectedValue(new Error('network down'))

		const { result } = renderHook(() => useDeleteLead())

		await act(async () => {
			await result.current.deleteLead(1)
		})

		await waitFor(() => expect(result.current.state.status).toBe('error'))
		expect(result.current.state.error).toBeTruthy()
	})
})
