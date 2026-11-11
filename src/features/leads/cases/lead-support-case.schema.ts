import { z } from 'zod'

const plainText = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/[<>]/.test(value), 'El texto no puede incluir HTML')
const positiveId = z.number().int().positive()

export const leadSupportCaseCreateSchema = z.object({
  subject: plainText(240),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedTo: positiveId.optional(),
  idBusiness: positiveId.optional(),
  dueAt: z.string().datetime().optional(),
}).strict()

const optionalComment = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value.length === 0 || !/[<>]/.test(value), 'El texto no puede incluir HTML')
  .optional()
  .transform((value) => (value ? value : undefined))

export const leadSupportCaseUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']),
  assignedTo: positiveId.optional(),
  comment: optionalComment,
}).strict()

export const leadSupportCaseCommentSchema = z.object({ body: plainText(2000) }).strict()
