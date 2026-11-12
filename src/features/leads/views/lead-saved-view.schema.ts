import { z } from 'zod'
import { parseSavedLeadTableQuery, type LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'

const nameSchema = z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres')

const querySchema = z.unknown().transform((value, ctx): LeadTableQuery => {
	const parsed = parseSavedLeadTableQuery(value)
	if (!parsed.ok) {
		ctx.addIssue({ code: 'custom', message: parsed.error })
		return z.NEVER
	}
	return parsed.query
})

export const leadSavedViewCreateSchema = z.object({ name: nameSchema, query: querySchema }).strict()

export const leadSavedViewUpdateSchema = z
	.object({ name: nameSchema.optional(), query: querySchema.optional() })
	.strict()
	.refine((value) => value.name !== undefined || value.query !== undefined, { message: 'Nada que actualizar' })
