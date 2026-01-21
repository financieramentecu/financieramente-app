import { z } from 'zod'

export const createProductOriginSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

export const updateProductOriginSchema = createProductOriginSchema.partial()

export const createClientOriginSchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre no puede exceder 100 caracteres'),
	description: z.string().optional(),
	status: z.boolean().default(true),
})

export const updateClientOriginSchema = createClientOriginSchema.partial()

export type CreateProductOriginFormData = z.infer<
	typeof createProductOriginSchema
>
export type UpdateProductOriginFormData = z.infer<
	typeof updateProductOriginSchema
>
export type CreateClientOriginFormData = z.infer<
	typeof createClientOriginSchema
>
export type UpdateClientOriginFormData = z.infer<
	typeof updateClientOriginSchema
>
