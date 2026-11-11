import { z } from 'zod'

export const moveLeadStageSchema = z
	.object({
		idLeadFunnelColumn: z.number().int().positive(),
	})
	.strict()
