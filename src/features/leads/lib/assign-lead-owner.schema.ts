import { z } from 'zod'

export const assignLeadOwnerSchema = z
	.object({
		idUser: z.number().int().positive(),
	})
	.strict()

export type AssignLeadOwnerInput = z.infer<typeof assignLeadOwnerSchema>
