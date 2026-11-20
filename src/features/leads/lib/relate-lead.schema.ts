import { z } from 'zod'

export const relateLeadSchema = z.object({
	idRelatedLead: z.number().int().positive('El lead relacionado es obligatorio'),
	idClientOrigin: z.number().int().positive('El origen es obligatorio'),
})

export type RelateLeadInput = z.infer<typeof relateLeadSchema>
