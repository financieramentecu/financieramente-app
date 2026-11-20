import { z } from 'zod'

export const MAX_TAGS_PER_LEAD = 20

export const leadTagCreateSchema = z
	.object({
		name: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
		color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').default('#64748b'),
	})
	.strict()

export const leadTagsSetSchema = z
	.object({
		tagIds: z.array(z.number().int().positive()).max(MAX_TAGS_PER_LEAD, `Máximo ${MAX_TAGS_PER_LEAD} etiquetas`),
	})
	.strict()
