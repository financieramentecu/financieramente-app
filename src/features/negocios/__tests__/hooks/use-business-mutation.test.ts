import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBusinessMutation } from '../../hooks/use-business-mutation'
import { businessService } from '../../services/business.service'
import { createMockBusiness } from '../fixtures/mock-business'
import type { BusinessEntity } from '../../types/business-entity.types'

// Mock businessService
vi.mock('../../services/business.service', () => ({
	businessService: {
		update: vi.fn(),
		cancel: vi.fn(),
		fondear: vi.fn(),
	},
}))

// Mock sonner toast
vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

describe('useBusinessMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('updateBusiness', () => {
		it('should update business successfully', async () => {
			const mockBusiness = createMockBusiness({
				id: 1,
				contract: 'PN0005678',
				status: 'EMITIDO',
			})

			vi.mocked(businessService.update).mockResolvedValueOnce({
				data: mockBusiness,
			})

			const { result } = renderHook(() => useBusinessMutation())

			expect(result.current.isUpdating).toBe(false)

			let updateResult: typeof mockBusiness | null = null

			await act(async () => {
				updateResult = await result.current.updateBusiness(1, {
					contract: 'PN0005678',
				})
			})

			expect(updateResult).toEqual(mockBusiness)
			expect(businessService.update).toHaveBeenCalledWith(1, {
				contract: 'PN0005678',
			})
		})

		it('should return null and show error on API error', async () => {
			vi.mocked(businessService.update).mockResolvedValueOnce({
				data: null,
				error: 'Contrato duplicado',
			})

			const { result } = renderHook(() => useBusinessMutation())

			let updateResult: unknown = undefined

			await act(async () => {
				updateResult = await result.current.updateBusiness(1, {
					contract: 'PN0005678',
				})
			})

			expect(updateResult).toBeNull()
		})

		it('should set isUpdating during request', async () => {
			let resolveUpdate: (value: unknown) => void
			const updatePromise = new Promise((resolve) => {
				resolveUpdate = resolve
			})

			vi.mocked(businessService.update).mockReturnValueOnce(
				updatePromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useBusinessMutation())

			// Start update
			act(() => {
				result.current.updateBusiness(1, { contract: 'PN0005678' })
			})

			// Should be updating
			await waitFor(() => {
				expect(result.current.isUpdating).toBe(true)
			})

			// Resolve
			await act(async () => {
				resolveUpdate!({ data: createMockBusiness() })
			})

			// Should not be updating
			await waitFor(() => {
				expect(result.current.isUpdating).toBe(false)
			})
		})
	})

	describe('cancelBusiness', () => {
		it('should cancel business successfully', async () => {
			const mockBusiness = createMockBusiness({
				id: 1,
				status: 'CANCELADO',
			})

			vi.mocked(businessService.cancel).mockResolvedValueOnce({
				data: mockBusiness,
			})

			const { result } = renderHook(() => useBusinessMutation())

			let cancelResult: BusinessEntity | null = null

			await act(async () => {
				cancelResult = await result.current.cancelBusiness(1, {
					reason: 'Cliente solicitó cancelación por cambio de planes',
				})
			})

			expect(cancelResult).toEqual(mockBusiness)
			expect(cancelResult!.status).toBe('CANCELADO')
		})

		it('should return null on permission error', async () => {
			vi.mocked(businessService.cancel).mockResolvedValueOnce({
				data: null,
				error: 'No tiene permisos para cancelar negocios',
			})

			const { result } = renderHook(() => useBusinessMutation())

			let cancelResult: unknown = undefined

			await act(async () => {
				cancelResult = await result.current.cancelBusiness(1, {
					reason: 'Motivo de prueba',
				})
			})

			expect(cancelResult).toBeNull()
		})

		it('should set isCancelling during request', async () => {
			let resolveCancel: (value: unknown) => void
			const cancelPromise = new Promise((resolve) => {
				resolveCancel = resolve
			})

			vi.mocked(businessService.cancel).mockReturnValueOnce(
				cancelPromise as Promise<{ data: null; error: string }>
			)

			const { result } = renderHook(() => useBusinessMutation())

			// Start cancel
			act(() => {
				result.current.cancelBusiness(1, { reason: 'Motivo de prueba largo' })
			})

			// Should be cancelling
			await waitFor(() => {
				expect(result.current.isCancelling).toBe(true)
			})

			// Resolve
			await act(async () => {
				resolveCancel!({ data: createMockBusiness({ status: 'CANCELADO' }) })
			})

			// Should not be cancelling
			await waitFor(() => {
				expect(result.current.isCancelling).toBe(false)
			})
		})
	})

	describe('fondearBusiness', () => {
		it('forwards fundedDate to businessService.fondear when provided', async () => {
			const mockBusiness = createMockBusiness({
				id: 1,
				status: 'FONDEADO',
			})

			vi.mocked(businessService.fondear).mockResolvedValueOnce({
				data: mockBusiness,
			})

			const { result } = renderHook(() => useBusinessMutation())

			let fondearResult: BusinessEntity | null = null

			await act(async () => {
				fondearResult = await result.current.fondearBusiness(1, '2026-06-15')
			})

			expect(fondearResult).toEqual(mockBusiness)
			expect(businessService.fondear).toHaveBeenCalledWith(1, '2026-06-15')
		})

		it('calls businessService.fondear without a date (backward compatible)', async () => {
			const mockBusiness = createMockBusiness({ id: 1, status: 'FONDEADO' })

			vi.mocked(businessService.fondear).mockResolvedValueOnce({
				data: mockBusiness,
			})

			const { result } = renderHook(() => useBusinessMutation())

			await act(async () => {
				await result.current.fondearBusiness(1)
			})

			expect(businessService.fondear).toHaveBeenCalledWith(1, undefined)
		})

		it('returns null and shows error toast on API error', async () => {
			vi.mocked(businessService.fondear).mockResolvedValueOnce({
				data: null,
				error: 'Este negocio tiene anualidades',
			})

			const { result } = renderHook(() => useBusinessMutation())

			let fondearResult: unknown = undefined

			await act(async () => {
				fondearResult = await result.current.fondearBusiness(1)
			})

			expect(fondearResult).toBeNull()
		})
	})
})
