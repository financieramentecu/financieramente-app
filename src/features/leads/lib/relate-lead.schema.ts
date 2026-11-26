import { z } from 'zod'

export const relateLeadSchema = z.object({
	idRelatedLead: z.number().int().positive('El lead relacionado es obligatorio'),
	idClientOrigin: z.number().int().positive().nullish(),
})

export type RelateLeadInput = z.infer<typeof relateLeadSchema>
