/**
 * Types for the Commission Discounts feature
 */

export const COMMISSION_DISCOUNT_TYPES = ['IMPUESTO', 'CLAWBACK'] as const
export type CommissionDiscountType = (typeof COMMISSION_DISCOUNT_TYPES)[number]

export const COMMISSION_DISCOUNT_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type CommissionDiscountStatus = (typeof COMMISSION_DISCOUNT_STATUSES)[number]

export interface CommissionDiscount {
	readonly id: number
	name: string
	type: CommissionDiscountType
	percentage: number
	description: string | null
	status: CommissionDiscountStatus
	readonly createdAt: string
	readonly updatedAt: string
	createdById: number | null
	updatedById: number | null
	createdBy?: { name: string } | null
	updatedBy?: { name: string } | null
}

export interface CreateCommissionDiscountInput {
	name: string
	type: CommissionDiscountType
	percentage: number
	description?: string | null
}

export interface CommissionDiscountListResponse {
	data: CommissionDiscount[]
}
