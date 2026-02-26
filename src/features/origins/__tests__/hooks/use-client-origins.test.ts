import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClientOrigins } from '../../hooks/use-client-origins'
import { clientOriginApi } from '../../lib/client-origin-api'
import type { ClientOriginListResponse } from '../../types/origins.types'

// Mock clientOriginApi
vi.mock('../../lib/client-origin-api', () => ({
	clientOriginApi: {
		getClientOrigins: vi.fn(),
	},
}))

const createMockListResponse = (): ClientOriginListResponse => ({
	origins: [
		{
			idClientOrigin: 1,
			name: 'Propio',
			description: 'Origen propio',
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		},
	],
	pagination: {
		page: 1,
		pageSize: 10,
		total: 1,
		totalPages: 1,
	},
})

describe('useClientOrigins', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should fetch client origins successfully (happy path)', async () => {
		const mockResponse = createMockListResponse()

		vi.mocked(clientOriginApi.getClientOrigins).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useClientOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(clientOriginApi.getClientOrigins).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener orígenes de cliente',
		})

		const { result } = renderHook(() => useClientOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error al obtener orígenes de cliente'
		)
	})

	it('should fetch with search params', async () => {
		const mockResponse = createMockListResponse()
		vi.mocked(clientOriginApi.getClientOrigins).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() =>
			useClientOrigins({ search: 'Propio', page: 1, pageSize: 10 })
		)

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(clientOriginApi.getClientOrigins).toHaveBeenCalledWith({
			search: 'Propio',
			page: 1,
			pageSize: 10,
		})
	})
})
