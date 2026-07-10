/**
 * Schema y tipos para PATCH /api/negocios/[id]/date-anchored
 * (edición manual de la fecha de fondeo con sincronización de Payment[1])
 */

import { z } from 'zod'

export const dateAnchoredBodySchema = z.object({
	dateAnchored: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'dateAnchored must be in YYYY-MM-DD format'),
})

export type DateAnchoredInput = z.infer<typeof dateAnchoredBodySchema>
