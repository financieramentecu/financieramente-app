import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommissionDiscountMutations } from '@/features/commission-discounts/hooks/use-commission-discount-mutations'

vi.mock('@/features/commission-discounts/lib/commission-discount-api', () => ({
	createCommissionDiscount: vi.fn(),
	inactivateCommissionDiscount: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
	createCommissionDiscount,
	inactivateCommissionDiscount,
} from '@/features/commission-discounts/lib/commission-discount-api'

const mockCreate = vi.mocked(createCommissionDiscount)
const mockInactivate = vi.mocked(inactivateCommissionDiscount)

const mockDiscount = {
	id: 1,
	name: 'Impuesto vigente',
	type: 'IMPUESTO' as const,
	percentage: 12,
	status: 'ACTIVE' as const,
	description: null,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
	createdById: 1,
	updatedById: null,
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('useCommissionDiscountMutations', () => {
	it('createDiscount calls API and onSuccess callback', async () => {
		mockCreate.mockResolvedValue(mockDiscount)
		const onSuccess = vi.fn()
		const { result } = renderHook(() => useCommissionDiscountMutations({ onSuccess }))
		await act(async () => {
			await result.current.createDiscount({ name: 'Impuesto vigente', type: 'IMPUESTO', percentage: 12 })
		})
		expect(mockCreate).toHaveBeenCalledTimes(1)
		expect(onSuccess).toHaveBeenCalledTimes(1)
	})

	it('inactivateDiscount calls API and onSuccess callback', async () => {
		mockInactivate.mockResolvedValue({ ...mockDiscount, status: 'INACTIVE' as const })
		const onSuccess = vi.fn()
		const { result } = renderHook(() => useCommissionDiscountMutations({ onSuccess }))
		await act(async () => {
			await result.current.inactivateDiscount(1)
		})
		expect(mockInactivate).toHaveBeenCalledWith(1)
		expect(onSuccess).toHaveBeenCalledTimes(1)
	})

	it('sets error state when createDiscount API call fails', async () => {
		mockCreate.mockRejectedValue(new Error('API error'))
		const onError = vi.fn()
		const { result } = renderHook(() => useCommissionDiscountMutations({ onError }))
		await act(async () => {
			await result.current.createDiscount({ name: 'Test', type: 'IMPUESTO', percentage: 5 })
		})
		expect(onError).toHaveBeenCalledTimes(1)
	})
})
