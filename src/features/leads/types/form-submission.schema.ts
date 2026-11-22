import { z } from 'zod'

/**
 * Field types n8n may send. A new landing is another `fields` array of these
 * types; the CRM does not add a column or a catalogue entry per landing.
 */
export const FORM_FIELD_TYPE = {
	TEXT: 'text',
	NUMBER: 'number',
	DATE: 'date',
	SELECT: 'select',
} as const

export type FormFieldType =
	(typeof FORM_FIELD_TYPE)[keyof typeof FORM_FIELD_TYPE]

const FORM_FIELD_TYPES = [
	FORM_FIELD_TYPE.TEXT,
	FORM_FIELD_TYPE.NUMBER,
	FORM_FIELD_TYPE.DATE,
	FORM_FIELD_TYPE.SELECT,
] as const

const offsetAwareInstant = z.iso
	.datetime({ offset: true })
	.transform((value) => new Date(value))

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value ? value : undefined))

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** True when `value` is a real calendar day. Parsed in UTC so the day does not shift. */
export function isCalendarDateOnly(value: string): boolean {
	if (!DATE_ONLY.test(value)) return false
	const [year, month, day] = value.split('-').map(Number)
	const date = new Date(Date.UTC(year, month - 1, day))
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	)
}

const textValue = z.string().trim().min(1).max(2000)
const selectChoice = z.string().trim().min(1).max(120)
const fieldValue = z.union([
	textValue,
	z.number().finite(),
	z.array(selectChoice).min(1).max(20),
	z.null(),
])

export const formFieldSchema = z
	.object({
		key: z
			.string()
			.trim()
			.min(1, 'La clave del campo es obligatoria')
			.max(80, 'La clave del campo admite máximo 80 caracteres'),
		label: z
			.string()
			.trim()
			.min(1, 'La etiqueta del campo es obligatoria')
			.max(120, 'La etiqueta admite máximo 120 caracteres'),
		type: z.enum(FORM_FIELD_TYPES),
		value: fieldValue,
	})
	.superRefine((field, context) => {
		if (field.value === null) return
		if (
			field.type === FORM_FIELD_TYPE.TEXT &&
			typeof field.value !== 'string'
		) {
			context.addIssue({
				code: 'custom',
				message: `${field.label}: el texto debe ser una cadena`,
				path: ['value'],
			})
		}
		if (
			field.type === FORM_FIELD_TYPE.NUMBER &&
			typeof field.value !== 'number'
		) {
			context.addIssue({
				code: 'custom',
				message: `${field.label}: el número debe ser numérico`,
				path: ['value'],
			})
		}
		if (field.type === FORM_FIELD_TYPE.DATE) {
			if (typeof field.value !== 'string' || !isCalendarDateOnly(field.value)) {
				context.addIssue({
					code: 'custom',
					message: `${field.label}: la fecha debe ser YYYY-MM-DD`,
					path: ['value'],
				})
			}
		}
		if (
			field.type === FORM_FIELD_TYPE.SELECT &&
			typeof field.value === 'number'
		) {
			context.addIssue({
				code: 'custom',
				message: `${field.label}: la selección debe ser texto`,
				path: ['value'],
			})
		}
	})

export const formFieldsSchema = z
	.array(formFieldSchema)
	.max(80, 'Máximo 80 campos')

const leadIdentitySchema = z
	.object({
		statusKey: z.string().trim().min(1, 'statusKey es obligatorio').max(120),
		name: optionalText(200),
		lastName: optionalText(200),
		email: z
			.union([z.literal(''), z.string().trim().email().max(150)])
			.optional(),
		phone: optionalText(30),
		identityNumber: optionalText(20),
		originTag: optionalText(120),
		ownerEmail: z
			.union([z.literal(''), z.string().trim().email().max(150)])
			.optional(),
	})
	.transform((lead) => ({
		...lead,
		email: lead.email ? lead.email : undefined,
		ownerEmail: lead.ownerEmail ? lead.ownerEmail : undefined,
	}))
	.refine((lead) => Boolean(lead.identityNumber || lead.email || lead.phone), {
		message: 'El prospecto necesita documento, correo o teléfono',
	})

/**
 * Body n8n posts to `POST /api/leads/form-submissions`.
 * Unknown keys are stripped. Empty strings are rejected inside `fields`:
 * n8n must send `null` for an empty answer so `0` and `"No"` stay intact.
 */
export const formSubmissionPayloadSchema = z.object({
	submissionId: z
		.string()
		.trim()
		.min(1, 'submissionId es obligatorio')
		.max(150),
	submittedAt: offsetAwareInstant,
	landing: z.object({
		key: z.string().trim().min(1, 'landing.key es obligatorio').max(80),
		name: z.string().trim().min(1, 'landing.name es obligatorio').max(120),
		version: z.string().trim().min(1, 'landing.version es obligatorio').max(40),
	}),
	utm_source: z.string().trim().max(2000).optional(),
	lead: leadIdentitySchema,
	fields: formFieldsSchema,
})

export type FormField = z.infer<typeof formFieldSchema>
export type FormSubmissionPayload = z.infer<typeof formSubmissionPayloadSchema>

/** A partial form envelope must not fall through to the flat CRM upsert. */
export function isFormSubmissionBody(body: unknown): boolean {
	return (
		typeof body === 'object' &&
		body !== null &&
		('submissionId' in body || 'landing' in body || 'fields' in body)
	)
}

export function readSubmissionId(body: unknown): string | undefined {
	if (typeof body !== 'object' || body === null || !('submissionId' in body))
		return undefined
	return typeof body.submissionId === 'string'
		? body.submissionId.slice(0, 150)
		: undefined
}
