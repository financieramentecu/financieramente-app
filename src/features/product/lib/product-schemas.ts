import { z } from 'zod'

/**
 * Schema para crear un producto
 */
export const createProductSchema = z.object({
	name: z
		.string()
		.min(2, 'El nombre del producto debe tener al menos 2 caracteres')
		.max(100, 'El nombre del producto no puede exceder 100 caracteres')
		.trim(),
	idCompany: z.number().int().positive('Debe seleccionar una compañía'),
	status: z.boolean(),
})

/**
 * Schema para actualizar un producto
 */
export const updateProductSchema = z.object({
	name: z
		.string()
		.min(2, 'El nombre del producto debe tener al menos 2 caracteres')
		.max(100, 'El nombre del producto no puede exceder 100 caracteres')
		.trim()
		.optional(),
	idCompany: z
		.number()
		.int()
		.positive('Debe seleccionar una compañía')
		.optional(),
	status: z.boolean().optional(),
})

/**
 * Tipos inferidos de los schemas
 */
export type CreateProductFormData = z.infer<typeof createProductSchema>
export type UpdateProductFormData = z.infer<typeof updateProductSchema>
