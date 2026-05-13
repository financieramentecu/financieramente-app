import { z } from 'zod'

/**
 * Schema para crear un producto
 */
export const createProductSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(200, 'El nombre no puede exceder 200 caracteres')
		.trim(),
	description: z.string().optional(),
	idCompany: z.coerce
		.number()
		.int('La compañía seleccionada no es válida')
		.positive('Debe seleccionar una compañía'),
	idTypeProduct: z.coerce.number().int().optional(),
	status: z.boolean().default(true),
	commissionPercentage: z.coerce.number().min(0).max(100).default(0),
	// No default: contributionType is required on create (spec: "no domain default")
	contributionType: z.enum(['REGULAR', 'UNICO']),
})

/**
 * Schema para actualizar un producto.
 * .partial() makes all fields optional — including contributionType — so PATCH
 * requests can omit it without failing validation. No code change needed here.
 */
export const updateProductSchema = createProductSchema.partial()

/**
 * Tipos inferidos de los schemas
 */
export type CreateProductFormData = z.infer<typeof createProductSchema>
export type UpdateProductFormData = z.infer<typeof updateProductSchema>
