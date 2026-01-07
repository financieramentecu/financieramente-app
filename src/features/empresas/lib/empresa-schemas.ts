import { z } from 'zod'

/**
 * Schema para crear una empresa/agencia
 */
export const createEmpresaSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre completo de la agencia es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim(),
	status: z.boolean(),
})

/**
 * Schema para actualizar una empresa/agencia
 */
export const updateEmpresaSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre completo de la agencia es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim()
		.optional(),
	status: z.boolean().optional(),
})

/**
 * Tipos inferidos de los schemas
 */
export type CreateEmpresaFormData = z.infer<typeof createEmpresaSchema>
export type UpdateEmpresaFormData = z.infer<typeof updateEmpresaSchema>

