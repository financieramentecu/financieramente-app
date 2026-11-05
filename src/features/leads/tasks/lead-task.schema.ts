import { z } from 'zod'

const plainText = z
	.string()
	.trim()
	.min(1)
	.max(240)
	.refine((value) => !/[<>]/.test(value), 'El título no puede incluir HTML')

const positiveUserId = z.number().int().positive()

export const leadTaskCreateSchema = z
	.object({
		title: plainText,
		assignedTo: positiveUserId,
		dueAt: z.string().datetime().optional(),
	})
	.strict()

export const leadTaskUpdateSchema = z
	.object({
		action: z.enum(['complete', 'reassign']),
		assignedTo: positiveUserId.optional(),
	})
	.superRefine((input, context) => {
		if (input.action === 'reassign' && !input.assignedTo) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'assignedTo es obligatorio' })
		}
		if (input.action === 'complete' && input.assignedTo) {
			context.addIssue({ code: z.ZodIssueCode.custom, message: 'assignedTo no aplica al completar' })
		}
	})
