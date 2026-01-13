import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEmpresas } from '../../hooks/use-empresas'
import { empresaApi } from '../../lib/empresa-api'
import {
	createMockEmpresa,
	createMockEmpresaListResponse,
} from '../fixtures/mock-empresa'

// Mock empresaApi
vi.mock('../../lib/empresa-api', () => ({
	empresaApi: {
		getEmpresas: vi.fn(),
	},
}))

describe('useEmpresas', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		vi.mocked(empresaApi.getEmpresas).mockResolvedValueOnce({
			data: createMockEmpresaListResponse(),
		})

		const { result } = renderHook(() => useEmpresas())

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch empresas successfully', async () => {
		const mockResponse = createMockEmpresaListResponse([
			createMockEmpresa({ idCompany: 1, name: 'Skandia' }),
			createMockEmpresa({ idCompany: 2, name: 'Sura' }),
		])

		vi.mocked(empresaApi.getEmpresas).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useEmpresas())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.data?.empresas).toHaveLength(2)
	})

	it('should handle API error', async () => {
		vi.mocked(empresaApi.getEmpresas).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener empresas',
		})

		const { result } = renderHook(() => useEmpresas())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Error al obtener empresas')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(empresaApi.getEmpresas).mockRejectedValueOnce(
			new Error('Network error')
		)

		// Suppress console.error for this test
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })

		const { result } = renderHook(() => useEmpresas())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		vi.mocked(empresaApi.getEmpresas).mockResolvedValueOnce({
			data: createMockEmpresaListResponse(),
		})

		renderHook(() => useEmpresas({ search: 'Skandia', page: 1, pageSize: 10 }))

		await waitFor(() => {
			expect(empresaApi.getEmpresas).toHaveBeenCalledWith({
				search: 'Skandia',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass status filter to API', async () => {
		vi.mocked(empresaApi.getEmpresas).mockResolvedValueOnce({
			data: createMockEmpresaListResponse(),
		})

		renderHook(() => useEmpresas({ status: 'active' }))

		await waitFor(() => {
			expect(empresaApi.getEmpresas).toHaveBeenCalledWith({
				status: 'active',
			})
		})
	})

	it('should refetch when refetch is called', async () => {
		const mockResponse = createMockEmpresaListResponse()
		vi.mocked(empresaApi.getEmpresas).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useEmpresas())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(empresaApi.getEmpresas).toHaveBeenCalledTimes(1)

		await result.current.refetch()

		await waitFor(() => {
			expect(empresaApi.getEmpresas).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when params change', async () => {
		const mockResponse = createMockEmpresaListResponse()
		vi.mocked(empresaApi.getEmpresas).mockResolvedValue({
			data: mockResponse,
		})

		const { rerender } = renderHook(({ search }) => useEmpresas({ search }), {
			initialProps: { search: 'Skandia' },
		})

		await waitFor(() => {
			expect(empresaApi.getEmpresas).toHaveBeenCalledWith({
				search: 'Skandia',
			})
		})

		rerender({ search: 'Sura' })

		await waitFor(() => {
			expect(empresaApi.getEmpresas).toHaveBeenCalledWith({
				search: 'Sura',
			})
		})
	})
})
