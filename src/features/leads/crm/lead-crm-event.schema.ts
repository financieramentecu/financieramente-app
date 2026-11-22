import { z } from 'zod'

const plainText = z
	.string()
	.trim()
	.min(1)
	.max(2_000)
	.refine((value) => !/[<>]/.test(value), 'El contenido no puede incluir HTML')

/**
 * The client may only submit a note or a logged contact (Odoo "Log activity",
 * EspoCRM Calls/Meetings). All lifecycle event types are reserved for feature
 * services, keeping the immutable timeline from becoming a free-form
 * client-controlled audit stream.
 */
export const LEAD_CRM_EVENT_TYPES = [
	'CREATED',
	'UPDATED',
	'STAGE_CHANGED',
	'OWNER_CHANGED',
	'NOTE_ADDED',
	'CALL_LOGGED',
	'MEETING_LOGGED',
	'EMAIL_LOGGED',
	'WHATSAPP_LOGGED',
	'TASK_CREATED',
	'TASK_COMPLETED',
	'CONVERSION_STARTED',
	'CONVERTED',
	'BUSINESS_LINKED',
	'CASE_OPENED',
	'CASE_UPDATED',
] as const

export type LeadCrmEventType = (typeof LEAD_CRM_EVENT_TYPES)[number]

export const LOGGED_CONTACT_TYPES = ['CALL_LOGGED', 'MEETING_LOGGED', 'EMAIL_LOGGED', 'WHATSAPP_LOGGED'] as const
export type LoggedContactType = (typeof LOGGED_CONTACT_TYPES)[number]

export const CONTACT_OUTCOMES = ['CONNECTED', 'NO_ANSWER', 'LEFT_MESSAGE', 'RESCHEDULED'] as const
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number]

const notInFuture = z
	.string()
	.datetime()
	.refine((value) => new Date(value).getTime() <= Date.now() + 60_000, 'La fecha no puede ser futura')

export const loggedContactPayloadSchema = z
	.object({
		summary: plainText,
		outcome: z.enum(CONTACT_OUTCOMES).optional(),
		durationMinutes: z.number().int().min(1).max(600).optional(),
		occurredAt: notInFuture.optional(),
	})
	.strict()

export type LoggedContactPayload = z.infer<typeof loggedContactPayloadSchema>

const noteEvent = z.object({ type: z.literal('NOTE_ADDED'), payload: z.object({ note: plainText }).strict() }).strict()

const loggedEvent = (type: LoggedContactType) =>
	z.object({ type: z.literal(type), payload: loggedContactPayloadSchema }).strict()

export const leadCrmEventInputSchema = z.discriminatedUnion('type', [
	noteEvent,
	loggedEvent('CALL_LOGGED'),
	loggedEvent('MEETING_LOGGED'),
	loggedEvent('EMAIL_LOGGED'),
	loggedEvent('WHATSAPP_LOGGED'),
])

export type LeadCrmEventInput = z.infer<typeof leadCrmEventInputSchema>
