import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClientOrigin } from '../../hooks/use-client-origin'
import { clientOriginApi } from '../../lib/client-origin-api'
import { createMockClientOrigin } from '../fixtures/mock-client-origin'

// Mock clientOriginApi
vi.mock('../../lib/client-origin-api', () => ({
	clientOriginApi: {
		getClientOrigin: vi.fn(),
	},
}))

describe('useClientOrigin', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockOrigin = createMockClientOrigin({ idClientOrigin: 1 })
		vi.mocked(clientOriginApi.getClientOrigin).mockResolvedValueOnce({
			data: mockOrigin,
		})

		const { result } = renderHook(() => useClientOrigin(1))

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch client origin successfully (happy path)', async () => {
		const mockOrigin = createMockClientOrigin({
			idClientOrigin: 1,
			name: 'Propio',
		})

		vi.mocked(clientOriginApi.getClientOrigin).mockResolvedValueOnce({
			data: mockOrigin,
		})

		const { result } = renderHook(() => useClientOrigin(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockOrigin)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(clientOriginApi.getClientOrigin).mockResolvedValueOnce({
			data: null,
			error: 'Origen de cliente no encontrado',
		})

		const { result } = renderHook(() => useClientOrigin(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Origen de cliente no encontrado')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle invalid ID', async () => {
		const { result } = renderHook(() => useClientOrigin(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de origen de cliente no válido')
	})
})
