/**
 * Schema y tipos para POST /api/negocios/[id]/fondear (fondeo directo, HU3)
 */

import { z } from 'zod'

export const fondearBodySchema = z.object({
	fundedDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'fundedDate must be YYYY-MM-DD')
		.optional(),
})

export type FondearInput = z.infer<typeof fondearBodySchema>
