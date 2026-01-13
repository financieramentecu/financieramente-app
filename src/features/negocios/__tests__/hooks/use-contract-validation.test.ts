import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useContractValidation } from '../../hooks/use-contract-validation'
import { businessService } from '../../services/business.service'

// Mock businessService
vi.mock('../../services/business.service', () => ({
	businessService: {
		validateContract: vi.fn(),
	},
}))

describe('useContractValidation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('Happy Path', () => {
		it('should validate available contract', async () => {
			vi.mocked(businessService.validateContract).mockResolvedValueOnce({
				data: { available: true },
			})

			const { result } = renderHook(() => useContractValidation())

			act(() => {
				result.current.validateContract('PN0009999')
			})

			// Advance past debounce
			await act(async () => {
				vi.advanceTimersByTime(500)
			})

			await waitFor(() => {
				expect(result.current.isValid).toBe(true)
				expect(result.current.error).toBeNull()
			})
		})

		it('should detect duplicate contract', async () => {
			vi.mocked(businessService.validateContract).mockResolvedValueOnce({
				data: { available: false, existingBusinessId: 5 },
			})

			const { result } = renderHook(() => useContractValidation())

			act(() => {
				result.current.validateContract('PN0005678')
			})

			await act(async () => {
				vi.advanceTimersByTime(500)
			})

			await waitFor(() => {
				expect(result.current.isValid).toBe(false)
				expect(result.current.existingBusinessId).toBe(5)
				expect(result.current.error).toContain('#5')
			})
		})

		it('should exclude business ID when provided', async () => {
			vi.mocked(businessService.validateContract).mockResolvedValueOnce({
				data: { available: true },
			})

			const { result } = renderHook(() => useContractValidation(1))

			act(() => {
				result.current.validateContract('PN0005678')
			})

			await act(async () => {
				vi.advanceTimersByTime(500)
			})

			expect(businessService.validateContract).toHaveBeenCalledWith(
				'PN0005678',
				1
			)
		})
	})

	describe('Debounce', () => {
		it('should debounce rapid calls', async () => {
			vi.mocked(businessService.validateContract).mockResolvedValueOnce({
				data: { available: true },
			})

			const { result } = renderHook(() => useContractValidation(undefined, 300))

			// Rapid calls
			act(() => {
				result.current.validateContract('P')
			})
			await act(async () => {
				vi.advanceTimersByTime(100)
			})

			act(() => {
				result.current.validateContract('PN')
			})
			await act(async () => {
				vi.advanceTimersByTime(100)
			})

			act(() => {
				result.current.validateContract('PN0')
			})
			await act(async () => {
				vi.advanceTimersByTime(100)
			})

			act(() => {
				result.current.validateContract('PN0009999')
			})

			// Only last call after full debounce should trigger
			await act(async () => {
				vi.advanceTimersByTime(300)
			})

			await waitFor(() => {
				expect(businessService.validateContract).toHaveBeenCalledTimes(1)
				expect(businessService.validateContract).toHaveBeenCalledWith(
					'PN0009999',
					undefined
				)
			})
		})
	})

	describe('Reset', () => {
		it('should reset validation state', async () => {
			vi.mocked(businessService.validateContract).mockResolvedValueOnce({
				data: { available: true },
			})

			const { result } = renderHook(() => useContractValidation())

			act(() => {
				result.current.validateContract('PN0009999')
			})

			await act(async () => {
				vi.advanceTimersByTime(500)
			})

			await waitFor(() => {
				expect(result.current.isValid).toBe(true)
			})

			// Reset
			act(() => {
				result.current.resetValidation()
			})

			expect(result.current.isValid).toBeNull()
			expect(result.current.error).toBeNull()
			expect(result.current.isValidating).toBe(false)
		})

		it('should reset when contract is empty', async () => {
			const { result } = renderHook(() => useContractValidation())

			act(() => {
				result.current.validateContract('')
			})

			expect(result.current.isValid).toBeNull()
			expect(businessService.validateContract).not.toHaveBeenCalled()
		})
	})

	describe('Loading State', () => {
		it('should set isValidating during validation', async () => {
			let resolveValidation: (value: unknown) => void
			const validationPromise = new Promise((resolve) => {
				resolveValidation = resolve
			})

			vi.mocked(businessService.validateContract).mockReturnValueOnce(
				validationPromise as Promise<{ data: { available: boolean } }>
			)

			const { result } = renderHook(() => useContractValidation())

			act(() => {
				result.current.validateContract('PN0009999')
			})

			// Start validating after debounce
			await act(async () => {
				vi.advanceTimersByTime(500)
			})

			expect(result.current.isValidating).toBe(true)

			// Resolve
			await act(async () => {
				resolveValidation!({ data: { available: true } })
			})

			await waitFor(() => {
				expect(result.current.isValidating).toBe(false)
			})
		})
	})
})
