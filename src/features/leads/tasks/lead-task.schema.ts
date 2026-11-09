import { z } from 'zod'

const plainText = z
	.string()
	.trim()
	.min(1)
	.max(240)
	.refine((value) => !/[<>]/.test(value), 'El título no puede incluir HTML')

const positiveUserId = z.number().int().positive()

/** Odoo-style scheduled activity types. */
export const LEAD_TASK_TYPES = ['TODO', 'CALL', 'MEETING', 'EMAIL', 'WHATSAPP'] as const
export type LeadTaskKind = (typeof LEAD_TASK_TYPES)[number]

export const leadTaskCreateSchema = z
	.object({
		title: plainText,
		assignedTo: positiveUserId,
		dueAt: z.string().datetime().optional(),
		type: z.enum(LEAD_TASK_TYPES).default('TODO'),
	})
	.strict()

export const leadTaskUpdateSchema = z
	.object({
		action: z.enum(['complete', 'reassign', 'reschedule']),
		assignedTo: positiveUserId.optional(),
		dueAt: z.string().datetime().nullable().optional(),
	})
	.superRefine((input, context) => {
		if (input.action === 'reassign' && !input.assignedTo) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'assignedTo es obligatorio' })
		}
		if (input.action === 'complete' && input.assignedTo) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'assignedTo no aplica al completar' })
		}
		if (input.action === 'reschedule' && input.dueAt === undefined) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'dueAt es obligatorio al reprogramar' })
		}
		if (input.action !== 'reschedule' && input.dueAt !== undefined) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'dueAt solo aplica al reprogramar' })
		}
	})
