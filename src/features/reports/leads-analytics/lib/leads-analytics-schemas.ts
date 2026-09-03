/**
 * Zod query contract for GET /api/reports/leads-analytics.
 */

import { z } from 'zod'

const isoDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser YYYY-MM-DD')

export const leadsAnalyticsQuerySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
	})
	.refine((value) => value.dateFrom <= value.dateTo, {
		message: 'La fecha de inicio debe ser anterior a la fecha fin',
		path: ['dateFrom'],
	})

export type LeadsAnalyticsQuery = z.infer<typeof leadsAnalyticsQuerySchema>
