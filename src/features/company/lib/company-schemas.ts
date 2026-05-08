import { z } from 'zod'

/**
 * Schema for creating a company
 */
export const createCompanySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre de la empresa es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim(),
	idCurrency: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'La moneda es obligatoria'),
	status: z.boolean(),
})

/**
 * Schema for updating a company
 */
export const updateCompanySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre de la empresa es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim()
		.optional(),
	idCurrency: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'La moneda es obligatoria').optional(),
	status: z.boolean().optional(),
})

/**
 * Inferred types from schemas
 */
export type CreateCompanyFormData = z.infer<typeof createCompanySchema>
export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>
