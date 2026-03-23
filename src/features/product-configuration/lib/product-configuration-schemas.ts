import { z } from 'zod'

/**
 * Schema for creating a product configuration
 */
export const createProductConfigurationSchema = z.object({
	idCompany: z.number().int().positive('Debe seleccionar una compañía'),
	idProduct: z.number().int().positive('Debe seleccionar un producto'),
	idClientOrigin: z
		.number()
		.int()
		.positive('Debe seleccionar un origen de cliente'),
	idCategory: z.number().int().positive('Debe seleccionar una categoría'),
})

/**
 * Schema for updating a product configuration
 */
export const updateProductConfigurationSchema = z.object({
	idProductPercentageCommissionNewBusinesses: z
		.number()
		.int()
		.positive('Debe seleccionar una comisión de porcentaje válida'),
})

/**
 * Inferred types from schemas
 */
export type CreateProductConfigurationFormData = z.infer<
	typeof createProductConfigurationSchema
>
export type UpdateProductConfigurationFormData = z.infer<
	typeof updateProductConfigurationSchema
>
