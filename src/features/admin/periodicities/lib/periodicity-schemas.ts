import { z } from 'zod'

export const createPeriodicitySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	active: z.boolean().default(true),
})

export const updatePeriodicitySchema = createPeriodicitySchema.partial()

export type CreatePeriodicityFormData = z.infer<typeof createPeriodicitySchema>
export type UpdatePeriodicityFormData = z.infer<typeof updatePeriodicitySchema>
