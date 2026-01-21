import { z } from 'zod'

/**
 * Schema para crear un producto
 */
export const createProductSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(200, 'El nombre no puede exceder 200 caracteres'),
	description: z.string().optional(),
	idCompany: z.coerce
		.number()
		.refine((value) => !Number.isNaN(value), {
			message: 'La compañía es obligatoria',
		})
		.int('La compañía seleccionada no es válida'),
	idTypeProduct: z.coerce.number().int().optional(),
	status: z.boolean().default(true),
})

/**
 * Schema para actualizar un producto
 */
export const updateProductSchema = createProductSchema.partial()

/**
 * Tipos inferidos de los schemas
 */
export type CreateProductFormData = z.infer<typeof createProductSchema>
export type UpdateProductFormData = z.infer<typeof updateProductSchema>
