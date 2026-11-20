import { z } from 'zod'
import { FORM_FIELD_TYPES, type FormFieldValue } from '@/features/leads/types/form-submission.types'

const offsetAwareInstant = z.iso.datetime({ offset: true }).transform((value) => new Date(value))

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function isNullToken(value: unknown): boolean {
	if (value === null || value === undefined) return true
	return typeof value === 'string' && (value.trim() === '' || value.trim().toLowerCase() === 'null')
}

function fail(ctx: z.RefinementCtx, message: string): null {
	ctx.addIssue({ code: 'custom', message })
	return null
}

function textValue(value: unknown, ctx: z.RefinementCtx): string | null {
	if (isNullToken(value)) return null
	if (typeof value !== 'string') return fail(ctx, 'El valor de texto debe ser texto o null')
	return value.trim()
}

function numberValue(value: unknown, ctx: z.RefinementCtx): number | null {
	if (isNullToken(value)) return null
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fail(ctx, 'El valor numérico debe ser un número o null')
	}
	return value
}

function dateValue(value: unknown, ctx: z.RefinementCtx): string | null {
	if (isNullToken(value)) return null
	if (typeof value !== 'string' || !isRealDateOnly(value)) {
		return fail(ctx, 'La fecha debe tener el formato YYYY-MM-DD o ser null')
	}
	return value
}

function isRealDateOnly(value: string): boolean {
	const match = DATE_ONLY.exec(value)
	if (!match) return false
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const date = new Date(Date.UTC(year, month - 1, day))
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function selectValue(value: unknown, ctx: z.RefinementCtx): string | string[] | null {
	if (isNullToken(value)) return null
	if (typeof value === 'string') return value.trim()
	if (!Array.isArray(value)) return fail(ctx, 'La selección debe ser texto, una lista de textos o null')

	const items: string[] = []
	for (const item of value) {
		if (typeof item !== 'string') return fail(ctx, 'La selección debe ser texto, una lista de textos o null')
		if (isNullToken(item)) continue
		items.push(item.trim())
	}
	return items
}

const keySchema = z.string().trim().min(1, 'La clave del campo es obligatoria').max(80)
const labelSchema = z.string().trim().min(1, 'La etiqueta del campo es obligatoria').max(200)

const formFieldSchema = z.discriminatedUnion('type', [
	z.object({
		key: keySchema,
		label: labelSchema,
		type: z.literal(FORM_FIELD_TYPES.TEXT),
		value: z.unknown().transform(textValue),
	}),
	z.object({
		key: keySchema,
		label: labelSchema,
		type: z.literal(FORM_FIELD_TYPES.NUMBER),
		value: z.unknown().transform(numberValue),
	}),
	z.object({
		key: keySchema,
		label: labelSchema,
		type: z.literal(FORM_FIELD_TYPES.DATE),
		value: z.unknown().transform(dateValue),
	}),
	z.object({
		key: keySchema,
		label: labelSchema,
		type: z.literal(FORM_FIELD_TYPES.SELECT),
		value: z.unknown().transform(selectValue),
	}),
])

const optionalContact = z.string().optional()

/**
 * Landing form contract posted by n8n to `POST /api/leads/crm-sync`.
 * Unknown keys are stripped. An invalid body rejects the whole request.
 */
export const formSubmissionSchema = z.object({
	submissionId: z.string().trim().min(1, 'submissionId es obligatorio').max(200),
	submittedAt: offsetAwareInstant,
	landing: z.object({
		key: z.string().trim().min(1, 'landing.key es obligatorio').max(80),
		name: z.string().trim().min(1, 'landing.name es obligatorio').max(120),
		version: z.string().trim().min(1, 'landing.version es obligatorio').max(40),
	}),
	/**
	 * Landing query parameter. Same field as the flat CRM sync.
	 * Also accepted as `?utm_source=` on this request.
	 */
	utm_source: z.string().optional(),
	lead: z.object({
		statusKey: z.string().trim().min(1, 'statusKey es obligatorio'),
		name: optionalContact,
		lastName: optionalContact,
		email: z.union([z.literal(''), z.string().email()]).optional(),
		phone: optionalContact,
		identityNumber: optionalContact,
		originTag: optionalContact,
		ownerEmail: z.string().trim().min(1, 'ownerEmail es obligatorio'),
	}),
	fields: z.array(formFieldSchema),
})

export type FormSubmissionPayload = z.infer<typeof formSubmissionSchema>

export function isFormSubmissionBody(body: unknown): boolean {
	return (
		typeof body === 'object' &&
		body !== null &&
		'submissionId' in body &&
		'landing' in body &&
		'fields' in body
	)
}

export function readSubmissionId(body: unknown): string | undefined {
	if (typeof body !== 'object' || body === null || !('submissionId' in body)) return undefined
	const value = (body as { submissionId?: unknown }).submissionId
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export type { FormFieldValue }
