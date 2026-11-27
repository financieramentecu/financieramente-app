import { z } from 'zod'
import { DATA_SCOPES } from '../types/access-control.types'

export const roleInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'El nombre es obligatorio')
		.max(100, 'El nombre es demasiado largo'),
	description: z
		.string()
		.trim()
		.max(500, 'La descripción es demasiado larga')
		.nullish()
		.transform((value) => (value ? value : null)),
})

const grantSchema = z.object({
	scope: z.enum(DATA_SCOPES).optional(),
	minLevelCode: z.string().trim().min(1).max(20).optional(),
})

export const rolePermissionsSchema = z.object({
	grants: z.record(z.string().min(1).max(80), grantSchema),
})
