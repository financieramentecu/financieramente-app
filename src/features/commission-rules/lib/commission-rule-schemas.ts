import { z } from 'zod'

// Category Line Item Schema
// Input: User enters 15.5 for 15.5%
// Storage: Converted to 0.1550 in DB (Decimal 5,4)
export const categoryPercentageSchema = z.object({
	idCategory: z.number().int().positive('La categoría es requerida'),
	percentage: z
		.number({ message: 'El porcentaje debe ser un número' })
		.min(0, 'El porcentaje no puede ser negativo')
		.max(100, 'El porcentaje no puede exceder 100%'),
})

// Create Commission Rule Schema
export const createCommissionRuleSchema = z.object({
	idProductConfiguration: z
		.number()
		.int()
		.positive('Configuración de producto inválida'),
	description: z
		.string()
		.min(3, 'La descripción debe tener al menos 3 caracteres')
		.max(255, 'La descripción no puede exceder 255 caracteres'),
	categories: z
		.array(categoryPercentageSchema)
		.min(1, 'Debe agregar al menos una categoría')
		.refine(
			(items) => {
				const total = items.reduce((acc, item) => acc + item.percentage, 0)
				return Math.abs(total - 100) < 0.01 // Floating point tolerance
			},
			{
				message: 'La suma de los porcentajes debe ser exactamente 100%',
			}
		),
})

// Update Commission Rule Schema
export const updateCommissionRuleSchema = z.object({
	idProductPercentageCommission: z
		.number()
		.int()
		.positive('ID de regla inválido'),
	description: z
		.string()
		.min(3, 'La descripción debe tener al menos 3 caracteres')
		.max(255, 'La descripción no puede exceder 255 caracteres')
		.optional(),
	active: z.boolean().optional(),
	categories: z
		.array(categoryPercentageSchema)
		.min(1, 'Debe agregar al menos una categoría')
		.refine(
			(items) => {
				const total = items.reduce((acc, item) => acc + item.percentage, 0)
				return Math.abs(total - 100) < 0.01
			},
			{
				message: 'La suma de los porcentajes debe ser exactamente 100%',
			}
		)
		.optional(),
})

// Inferred Types
export type CreateCommissionRuleFormData = z.infer<
	typeof createCommissionRuleSchema
>
export type UpdateCommissionRuleFormData = z.infer<
	typeof updateCommissionRuleSchema
>
export type CategoryPercentageFormData = z.infer<typeof categoryPercentageSchema>
