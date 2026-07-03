/**
 * Schema y tipos para POST fondear-anualidades (HU4)
 */

import { z } from 'zod'

export const fondearAnualidadesBodySchema = z.object({
	fundedInstallmentIndexes: z
		.array(z.number().int().min(1))
		.min(1)
		.transform((indexes) => [...new Set(indexes)]),
	fundedDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'fundedDate must be YYYY-MM-DD')
		.optional(),
})

export type FondearAnualidadesInput = z.infer<typeof fondearAnualidadesBodySchema>
