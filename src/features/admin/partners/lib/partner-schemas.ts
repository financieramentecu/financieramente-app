import { z } from 'zod'
import { PARTNER_LEADER_LEVEL_CODES } from '@/features/shared/lib/level-codes'

export const PARTNER_IDENTITY_TYPES = ['CC', 'CE', 'NIT', 'PA'] as const

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value ? value : undefined))

/**
 * Create-partner payload. Role, level, category and lifecycle state are NOT
 * part of the schema: the server assigns them (zod strips unknown keys).
 */
export const createPartnerSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'El nombre es obligatorio')
		.max(150, 'El nombre es demasiado largo'),
	lastName: optionalText(150),
	typeIdentity: z.enum(PARTNER_IDENTITY_TYPES, {
		error: 'Tipo de documento inválido',
	}),
	identityNumber: z
		.string()
		.trim()
		.min(1, 'El número de documento es obligatorio')
		.max(20, 'El número de documento es demasiado largo')
		.regex(
			/^[A-Za-z0-9-]+$/,
			'El número de documento solo admite letras, números y guiones'
		),
	email: z
		.string()
		.trim()
		.toLowerCase()
		.max(150, 'El correo electrónico es demasiado largo')
		.pipe(z.email('Correo electrónico inválido')),
	phone: optionalText(30),
	leaderId: z
		.number({ error: 'Selecciona un líder' })
		.int('Selecciona un líder')
		.positive('Selecciona un líder'),
})

/**
 * Edit-partner payload (PM-09). The e-mail is the sign-in identifier and is
 * not editable; like role, level, category and lifecycle state it is simply
 * absent from the schema, so zod strips it from any body.
 */
export const updatePartnerSchema = createPartnerSchema.omit({ email: true })

/** `levelCode` query of the leader picker: LEVEL_1..LEVEL_5 only. */
export const leaderLevelQuerySchema = z.enum(
	PARTNER_LEADER_LEVEL_CODES as [string, ...string[]],
	{ error: 'Nivel de líder inválido' }
)

export type CreatePartnerSchemaInput = z.infer<typeof createPartnerSchema>
export type UpdatePartnerSchemaInput = z.infer<typeof updatePartnerSchema>
