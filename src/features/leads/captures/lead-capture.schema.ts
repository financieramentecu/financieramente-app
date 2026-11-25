import { z } from 'zod'

export const leadCaptureSchema = z.object({
	name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
	level: z.number().int().min(0),
	status: z.boolean().default(true),
})
export const leadCapturePatchSchema = leadCaptureSchema
	.partial()
	.refine(
		(value) => Object.keys(value).length > 0,
		'Ingresa al menos un cambio'
	)
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>
export type LeadCapturePatch = z.infer<typeof leadCapturePatchSchema>
