import { z } from 'zod'

/**
 * Schema for creating a category
 */
export const createCategorySchema = z.object({
	code: z
		.string()
		.min(1, 'El código es requerido')
		.max(20, 'El código no puede exceder 20 caracteres')
		.trim(),
	name: z
		.string()
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(50, 'El nombre no puede exceder 50 caracteres')
		.trim(),
	typeCategory: z.string().min(1, 'El tipo de categoría es requerido'),
	descripcion: z.string().nullable().optional(),
	status: z.boolean(),
})

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z.object({
	code: z
		.string()
		.min(1, 'El código es requerido')
		.max(20, 'El código no puede exceder 20 caracteres')
		.trim()
		.optional(),
	name: z
		.string()
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(50, 'El nombre no puede exceder 50 caracteres')
		.trim()
		.optional(),
	typeCategory: z.string().optional(),
	descripcion: z.string().nullable().optional(),
	status: z.boolean().optional(),
})

/**
 * Inferred types from schemas
 */
export type CreateCategoryFormData = z.infer<typeof createCategorySchema>
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>
