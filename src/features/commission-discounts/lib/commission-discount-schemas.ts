import { z } from 'zod'
import { COMMISSION_DISCOUNT_TYPES } from '@/features/commission-discounts/types/commission-discount.types'

export const createCommissionDiscountSchema = z.object({
	name: z.string().min(1),
	type: z.enum(COMMISSION_DISCOUNT_TYPES),
	percentage: z.number().min(0.01).max(100),
	description: z.string().optional(),
})

export type CreateCommissionDiscountData = z.infer<typeof createCommissionDiscountSchema>
