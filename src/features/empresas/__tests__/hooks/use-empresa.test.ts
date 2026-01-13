import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEmpresa } from '../../hooks/use-empresa'
import { empresaApi } from '../../lib/empresa-api'
import { createMockEmpresa } from '../fixtures/mock-empresa'

// Mock empresaApi
vi.mock('../../lib/empresa-api', () => ({
	empresaApi: {
		getEmpresa: vi.fn(),
	},
}))

describe('useEmpresa', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		vi.mocked(empresaApi.getEmpresa).mockResolvedValueOnce({
			data: createMockEmpresa(),
		})

		const { result } = renderHook(() => useEmpresa(1))

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch empresa successfully', async () => {
		const mockEmpresa = createMockEmpresa({
			idCompany: 1,
			name: 'Skandia Seguros',
			status: true,
		})

		vi.mocked(empresaApi.getEmpresa).mockResolvedValueOnce({
			data: mockEmpresa,
		})

		const { result } = renderHook(() => useEmpresa(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockEmpresa)
		expect(result.current.state.data?.name).toBe('Skandia Seguros')
	})

	it('should handle API error', async () => {
		vi.mocked(empresaApi.getEmpresa).mockResolvedValueOnce({
			data: null,
			error: 'Empresa no encontrada',
		})

		const { result } = renderHook(() => useEmpresa(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Empresa no encontrada')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(empresaApi.getEmpresa).mockRejectedValueOnce(
			new Error('Network error')
		)

		// Suppress console.error for this test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })

		const { result } = renderHook(() => useEmpresa(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')

		consoleError.mockRestore()
	})

	it('should handle invalid ID', async () => {
		const { result } = renderHook(() => useEmpresa(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de empresa no válido')
	})

	it('should refetch when refetch is called', async () => {
		const mockEmpresa = createMockEmpresa()
		vi.mocked(empresaApi.getEmpresa).mockResolvedValue({
			data: mockEmpresa,
		})

		const { result } = renderHook(() => useEmpresa(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(empresaApi.getEmpresa).toHaveBeenCalledTimes(1)

		await result.current.refetch()

		await waitFor(() => {
			expect(empresaApi.getEmpresa).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when ID changes', async () => {
		const mockEmpresa1 = createMockEmpresa({ idCompany: 1 })
		const mockEmpresa2 = createMockEmpresa({ idCompany: 2 })

		vi.mocked(empresaApi.getEmpresa)
			.mockResolvedValueOnce({ data: mockEmpresa1 })
			.mockResolvedValueOnce({ data: mockEmpresa2 })

		const { result, rerender } = renderHook(
			({ id }: { id: number }) => useEmpresa(id),
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
