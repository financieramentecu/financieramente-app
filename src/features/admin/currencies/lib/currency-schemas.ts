import { z } from 'zod'

export const createCurrencySchema = z.object({
	name: z
		.string()
		.min(1, 'El nombre es obligatorio')
		.max(50, 'El nombre no puede exceder 50 caracteres'),
	symbol: z
		.string()
		.max(5, 'El símbolo no puede exceder 5 caracteres')
		.optional(),
	active: z.boolean().default(true),
})

export const updateCurrencySchema = createCurrencySchema.partial()

export type CreateCurrencyFormData = z.infer<typeof createCurrencySchema>
export type UpdateCurrencyFormData = z.infer<typeof updateCurrencySchema>
