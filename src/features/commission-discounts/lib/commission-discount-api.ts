import { apiClient } from '@/lib/api/client'
import type {
	CommissionDiscount,
	CommissionDiscountListResponse,
	CreateCommissionDiscountInput,
} from '@/features/commission-discounts/types/commission-discount.types'

export async function getCommissionDiscounts(): Promise<CommissionDiscount[]> {
	const response = await apiClient.get<CommissionDiscountListResponse>('/admin/discounts')
	return response.data ?? []
}

export async function createCommissionDiscount(
	input: CreateCommissionDiscountInput
): Promise<CommissionDiscount> {
	const response = await apiClient.post<{ data: CommissionDiscount }>('/admin/discounts', input)
	return response.data
}

export async function inactivateCommissionDiscount(id: number): Promise<CommissionDiscount> {
	const response = await apiClient.post<{ data: CommissionDiscount }>(
		`/admin/discounts/${id}/inactivate`,
		{}
	)
	return response.data
}
