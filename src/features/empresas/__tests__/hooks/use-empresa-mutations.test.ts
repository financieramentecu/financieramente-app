import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEmpresaMutations } from '../../hooks/use-empresa-mutations'
import { empresaApi } from '../../lib/empresa-api'
import { createMockEmpresa } from '../fixtures/mock-empresa'

// Mock empresaApi
vi.mock('../../lib/empresa-api', () => ({
	empresaApi: {
		createEmpresa: vi.fn(),
		updateEmpresa: vi.fn(),
		deleteEmpresa: vi.fn(),
	},
}))

describe('useEmpresaMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createEmpresa', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useEmpresaMutations())

			expect(result.current.createState.status).toBe('idle')
		})

		it('should create empresa successfully', async () => {
			const mockEmpresa = createMockEmpresa({
				idCompany: 1,
				name: 'Skandia Seguros',
				status: true,
			})

			vi.mocked(empresaApi.createEmpresa).mockResolvedValueOnce({
				data: mockEmpresa,
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.createEmpresa({
					name: 'Skandia Seguros',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockEmpresa)
			expect(empresaApi.createEmpresa).toHaveBeenCalledWith({
				name: 'Skandia Seguros',
				status: true,
			})
		})

		it('should handle create error', async () => {
			vi.mocked(empresaApi.createEmpresa).mockResolvedValueOnce({
				data: null,
				error: 'Ya existe una empresa con este nombre',
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.createEmpresa({
					name: 'Skandia Seguros',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe(
				'Ya existe una empresa con este nombre'
			)
		})

		it('should set loading state during creation', async () => {
			let resolveCreate: (value: unknown) => void
			const createPromise = new Promise((resolve) => {
				resolveCreate = resolve
			})

			vi.mocked(empresaApi.createEmpresa).mockReturnValueOnce(
				createPromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useEmpresaMutations())

			act(() => {
				result.current.createEmpresa({
					name: 'Skandia Seguros',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('loading')
			})

			await act(async () => {
				resolveCreate!({ data: createMockEmpresa() })
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})
		})
	})

	describe('updateEmpresa', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useEmpresaMutations())

			expect(result.current.updateState.status).toBe('idle')
		})

		it('should update empresa successfully', async () => {
			const mockEmpresa = createMockEmpresa({
				idCompany: 1,
				name: 'Skandia Seguros',
				status: false,
			})

			vi.mocked(empresaApi.updateEmpresa).mockResolvedValueOnce({
				data: mockEmpresa,
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.updateEmpresa(1, { status: false })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockEmpresa)
			expect(empresaApi.updateEmpresa).toHaveBeenCalledWith(1, {
				status: false,
			})
		})

		it('should handle update error', async () => {
			vi.mocked(empresaApi.updateEmpresa).mockResolvedValueOnce({
				data: null,
				error: 'Empresa no encontrada',
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.updateEmpresa(1, { status: false })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe('Empresa no encontrada')
		})

		it('should set loading state during update', async () => {
			let resolveUpdate: (value: unknown) => void
			const updatePromise = new Promise((resolve) => {
				resolveUpdate = resolve
			})

			vi.mocked(empresaApi.updateEmpresa).mockReturnValueOnce(
				updatePromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useEmpresaMutations())

			act(() => {
				result.current.updateEmpresa(1, { status: false })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('loading')
			})

			await act(async () => {
				resolveUpdate!({ data: createMockEmpresa() })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})
		})
	})

	describe('deleteEmpresa', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useEmpresaMutations())

			expect(result.current.deleteState.status).toBe('idle')
		})

		it('should delete empresa successfully', async () => {
			vi.mocked(empresaApi.deleteEmpresa).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.deleteEmpresa(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})

			expect(empresaApi.deleteEmpresa).toHaveBeenCalledWith(1)
		})

		it('should handle delete error', async () => {
			vi.mocked(empresaApi.deleteEmpresa).mockResolvedValueOnce({
				data: null,
				error: 'Empresa no encontrada',
			})

			const { result } = renderHook(() => useEmpresaMutations())

			await act(async () => {
				await result.current.deleteEmpresa(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe('Empresa no encontrada')
		})

		it('should set loading state during delete', async () => {
			let resolveDelete: (value: unknown) => void
			const deletePromise = new Promise((resolve) => {
				resolveDelete = resolve
			})

			vi.mocked(empresaApi.deleteEmpresa).mockReturnValueOnce(
				deletePromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useEmpresaMutations())

			act(() => {
				result.current.deleteEmpresa(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('loading')
			})

			await act(async () => {
				resolveDelete!({ data: undefined })
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})
		})
	})
})
