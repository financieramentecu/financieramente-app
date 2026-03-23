import { z } from 'zod'

/**
 * Common schemas for the Origins feature (covers both Product and Client origins)
 */

// --- PRODUCT ORIGINS ---

export const createProductOriginSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre del origen es obligatorio')
		.max(100, 'El nombre del origen no puede exceder 100 caracteres')
		.trim(),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

export const updateProductOriginSchema = createProductOriginSchema.partial()

// --- CLIENT ORIGINS ---

/**
 * Schema para crear un origen de cliente
 */
export const createClientOriginSchema = z.object({
	name: z
		.string()
		.min(2, 'El nombre del origen debe tener al menos 2 caracteres')
		.max(100, 'El nombre del origen no puede exceder 100 caracteres')
		.trim(),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

/**
 * Schema para actualizar un origen de cliente
 */
export const updateClientOriginSchema = z.object({
	name: z
		.string()
		.min(2, 'El nombre del origen debe tener al menos 2 caracteres')
		.max(100, 'El nombre del origen no puede exceder 100 caracteres')
		.trim()
		.optional(),
	description: z.string().optional(),
	status: z.boolean().optional(),
})

/**
 * Tipos inferidos de los schemas
 */
export type CreateProductOriginFormData = z.infer<typeof createProductOriginSchema>
export type UpdateProductOriginFormData = z.infer<typeof updateProductOriginSchema>
export type CreateClientOriginFormData = z.infer<typeof createClientOriginSchema>
export type UpdateClientOriginFormData = z.infer<typeof updateClientOriginSchema>
