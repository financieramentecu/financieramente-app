import { z } from 'zod'

/**
 * Schema para crear una categoría
 */
export const createCategorySchema = z.object({
	code: z
		.string()
		.min(1, 'El código es obligatorio')
		.max(20, 'El código no puede exceder 20 caracteres'),
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	typeCategory: z.enum(['MMS', 'ALIADO', 'TRINITY'], {
		message: 'Debe ser MMS, ALIADO o TRINITY',
	}),
	descripcion: z.string().optional(),
	status: z.boolean().default(true),
})

/**
 * Schema para actualizar una categoría
 */
export const updateCategorySchema = createCategorySchema.partial()

/**
 * Tipos inferidos de los schemas
 */
export type CreateCategoryFormData = z.infer<typeof createCategorySchema>
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>
