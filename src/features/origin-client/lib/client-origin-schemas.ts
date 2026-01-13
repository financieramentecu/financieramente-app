import { z } from 'zod'

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
export type CreateClientOriginFormData = z.infer<
	typeof createClientOriginSchema
>
export type UpdateClientOriginFormData = z.infer<
	typeof updateClientOriginSchema
>
