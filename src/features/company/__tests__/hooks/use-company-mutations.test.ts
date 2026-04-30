import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCompanyMutations } from '../../hooks/use-company-mutations'
import { companyApi } from '../../lib/company-api'
import { createMockCompany } from '../fixtures/mock-company'

// Mock companyApi
vi.mock('../../lib/company-api', () => ({
	companyApi: {
		createCompany: vi.fn(),
		updateCompany: vi.fn(),
		deleteCompany: vi.fn(),
	},
}))

describe('useCompanyMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createCompany', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useCompanyMutations())

			expect(result.current.createState.status).toBe('idle')
		})

		it('should create company successfully', async () => {
			const mockCompany = createMockCompany({
				idCompany: 1,
				name: 'Skandia Seguros',
				idCurrency: 1,
				status: true,
			})

			vi.mocked(companyApi.createCompany).mockResolvedValueOnce({
				data: mockCompany,
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.createCompany({
					name: 'Skandia Seguros',
					idCurrency: 1,
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockCompany)
			expect(companyApi.createCompany).toHaveBeenCalledWith({
				name: 'Skandia Seguros',
				idCurrency: 1,
				status: true,
			})
		})

		it('should handle create error', async () => {
			vi.mocked(companyApi.createCompany).mockResolvedValueOnce({
				data: null,
				error: 'Ya existe una empresa con este nombre',
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.createCompany({
					name: 'Skandia Seguros',
					idCurrency: 1,
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

			vi.mocked(companyApi.createCompany).mockReturnValueOnce(
				createPromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useCompanyMutations())

			act(() => {
				result.current.createCompany({
					name: 'Skandia Seguros',
					idCurrency: 1,
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('loading')
			})

			await act(async () => {
				resolveCreate!({ data: createMockCompany() })
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})
		})
	})

	describe('updateCompany', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useCompanyMutations())

			expect(result.current.updateState.status).toBe('idle')
		})

		it('should update company successfully', async () => {
			const mockCompany = createMockCompany({
				idCompany: 1,
				name: 'Skandia Seguros',
				idCurrency: 1,
				status: false,
			})

			vi.mocked(companyApi.updateCompany).mockResolvedValueOnce({
				data: mockCompany,
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.updateCompany(1, { status: false })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockCompany)
			expect(companyApi.updateCompany).toHaveBeenCalledWith(1, {
				status: false,
			})
		})

		it('should handle update error', async () => {
			vi.mocked(companyApi.updateCompany).mockResolvedValueOnce({
				data: null,
				error: 'Empresa no encontrada',
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.updateCompany(1, { status: false })
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

			vi.mocked(companyApi.updateCompany).mockReturnValueOnce(
				updatePromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useCompanyMutations())

			act(() => {
				result.current.updateCompany(1, { status: false })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('loading')
			})

			await act(async () => {
				resolveUpdate!({ data: createMockCompany() })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})
		})
	})

	describe('deleteCompany', () => {
		it('should start with idle state', () => {
			const { result } = renderHook(() => useCompanyMutations())

			expect(result.current.deleteState.status).toBe('idle')
		})

		it('should delete company successfully', async () => {
			vi.mocked(companyApi.deleteCompany).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.deleteCompany(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})

			expect(companyApi.deleteCompany).toHaveBeenCalledWith(1)
		})

		it('should handle delete error', async () => {
			vi.mocked(companyApi.deleteCompany).mockResolvedValueOnce({
				data: null,
				error: 'Empresa no encontrada',
			})

			const { result } = renderHook(() => useCompanyMutations())

			await act(async () => {
				await result.current.deleteCompany(1)
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

			vi.mocked(companyApi.deleteCompany).mockReturnValueOnce(
				deletePromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useCompanyMutations())

			act(() => {
				result.current.deleteCompany(1)
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
