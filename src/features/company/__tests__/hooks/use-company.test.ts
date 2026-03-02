import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCompany } from '../../hooks/use-company'
import { companyApi } from '../../lib/company-api'
import { createMockCompany } from '../fixtures/mock-company'

// Mock companyApi
vi.mock('../../lib/company-api', () => ({
	companyApi: {
		getCompany: vi.fn(),
	},
}))

describe('useCompany', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		vi.mocked(companyApi.getCompany).mockResolvedValueOnce({
			data: createMockCompany(),
		})

		const { result } = renderHook(() => useCompany(1))

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch company successfully', async () => {
		const mockCompany = createMockCompany({
			idCompany: 1,
			name: 'Skandia Seguros',
			status: true,
		})

		vi.mocked(companyApi.getCompany).mockResolvedValueOnce({
			data: mockCompany,
		})

		const { result } = renderHook(() => useCompany(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockCompany)
		expect(result.current.state.data?.name).toBe('Skandia Seguros')
	})

	it('should handle API error', async () => {
		vi.mocked(companyApi.getCompany).mockResolvedValueOnce({
			data: null,
			error: 'Empresa no encontrada',
		})

		const { result } = renderHook(() => useCompany(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Empresa no encontrada')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(companyApi.getCompany).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const { result } = renderHook(() => useCompany(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')

		consoleError.mockRestore()
	})

	it('should handle invalid ID', async () => {
		const { result } = renderHook(() => useCompany(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de empresa no válido')
	})

	it('should refetch when refetch is called', async () => {
		const mockCompany = createMockCompany()
		vi.mocked(companyApi.getCompany).mockResolvedValue({
			data: mockCompany,
		})

		const { result } = renderHook(() => useCompany(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(companyApi.getCompany).toHaveBeenCalledTimes(1)

		await result.current.refetch()

		await waitFor(() => {
			expect(companyApi.getCompany).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when ID changes', async () => {
		const mockCompany1 = createMockCompany({ idCompany: 1 })
		const mockCompany2 = createMockCompany({ idCompany: 2 })

		vi.mocked(companyApi.getCompany)
			.mockResolvedValueOnce({ data: mockCompany1 })
			.mockResolvedValueOnce({ data: mockCompany2 })

		const { result, rerender } = renderHook(
			({ id }: { id: number }) => useCompany(id),
			{
				initialProps: { id: 1 },
			}
		)

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.idCompany).toBe(1)

		rerender({ id: 2 })

		await waitFor(() => {
			expect(result.current.state.data?.idCompany).toBe(2)
		})
	})
})
