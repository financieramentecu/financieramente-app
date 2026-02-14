import { z } from 'zod'

// Category Line Item Schema
export const commissionRuleCategorySchema = z.object({
	idCategory: z.number().int().positive('La categoría es requerida'),
	percentage: z
		.number()
		.min(0.01, 'El porcentaje debe ser mayor a 0')
		.max(999.99, 'El porcentaje no puede exceder 999.99'),
})

// Create Commission Rule Schema
export const createCommissionRuleSchema = z.object({
	idProductConfiguration: z.number().int().positive(),
	description: z
		.string()
		.max(255, 'La descripción no puede exceder 255 caracteres')
		.optional(),
	categories: z.array(commissionRuleCategorySchema).optional(),
})

// Update Commission Rule Schema
export const updateCommissionRuleSchema = z.object({
	idProductPercentageCommission: z.number().int().positive(),
	description: z
		.string()
		.max(255, 'La descripción no puede exceder 255 caracteres')
		.optional(),
	active: z.boolean().optional(),
	categories: z.array(commissionRuleCategorySchema).optional(),
})

export type CreateCommissionRuleSchema = z.infer<
	typeof createCommissionRuleSchema
>
export type UpdateCommissionRuleSchema = z.infer<
	typeof updateCommissionRuleSchema
>
