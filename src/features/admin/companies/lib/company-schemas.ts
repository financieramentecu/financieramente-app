import { z } from 'zod'

/**
 * Schema para crear una compañía
 */
export const createCompanySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	idTypeCompany: z.enum(['NACIONAL', 'INTERNACIONAL'], {
		message: 'Debe ser NACIONAL o INTERNACIONAL',
	}),
	status: z.boolean().default(true),
})

/**
 * Schema para actualizar una compañía
 */
export const updateCompanySchema = createCompanySchema.partial()

/**
 * Tipos inferidos de los schemas
 */
export type CreateCompanyFormData = z.infer<typeof createCompanySchema>
export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>
