import { z } from 'zod'

/**
 * Schema for creating a category
 * Required: name, idCategoryType
 * Optional: description, status (defaults to true)
 */
export const createCategorySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es requerido')
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim(),
	idCategoryType: z
		.number({ error: 'El tipo de categoría es requerido' })
		.int()
		.positive('El tipo de categoría debe ser un número positivo'),
	description: z.string().nullable().optional(),
	status: z.boolean().default(true),
})

/**
 * Schema for updating a category (all fields optional)
 */
export const updateCategorySchema = z.object({
	name: z
		.string()
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim()
		.optional(),
	idCategoryType: z
		.number()
		.int()
		.positive('El tipo de categoría debe ser un número positivo')
		.optional(),
	description: z.string().nullable().optional(),
	status: z.boolean().optional(),
})

/**
 * Inferred types from schemas (output after defaults and transforms)
 */
export type CreateCategoryFormData = z.output<typeof createCategorySchema>
export type UpdateCategoryFormData = z.output<typeof updateCategorySchema>
