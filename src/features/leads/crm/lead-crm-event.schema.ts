import { z } from 'zod'

const plainText = z
	.string()
	.trim()
	.min(1)
	.max(2_000)
	.refine((value) => !/[<>]/.test(value), 'El contenido no puede incluir HTML')

/**
 * The client may only submit a note. All lifecycle event types are reserved
 * for feature services, keeping the immutable timeline from becoming a
 * free-form client-controlled audit stream.
 */
export const LEAD_CRM_EVENT_TYPES = [
	'CREATED',
	'UPDATED',
	'STAGE_CHANGED',
	'OWNER_CHANGED',
	'NOTE_ADDED',
	'TASK_CREATED',
	'TASK_COMPLETED',
	'CONVERSION_STARTED',
	'CONVERTED',
	'BUSINESS_LINKED',
	'CASE_OPENED',
	'CASE_UPDATED',
] as const

export type LeadCrmEventType = (typeof LEAD_CRM_EVENT_TYPES)[number]

export const leadCrmEventInputSchema = z
	.object({
		type: z.literal('NOTE_ADDED'),
		payload: z.object({ note: plainText }).strict(),
	})
	.strict()

export type LeadCrmEventInput = z.infer<typeof leadCrmEventInputSchema>
