/**
 * Zod query contract for Leads Analytics report APIs.
 */

import { z } from 'zod'
import { parseCellOwnerFilter } from './cell-owner-filter'

const CELL_QUERY_OUTCOME_STATUSES = [
	'OPEN',
	'WON',
	'LOST',
	'ABANDONED',
] as const

const isoDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser YYYY-MM-DD')

function parseCommaIds(raw: string | undefined): number[] {
	if (!raw || raw.trim() === '') return []
	const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)
	const ids: number[] = []
	for (const part of parts) {
		const n = Number(part)
		if (!Number.isInteger(n) || n <= 0) {
			throw new Error(`ID inválido: ${part}`)
		}
		ids.push(n)
	}
	return ids
}

function refineDateOrder(
	val: { dateFrom: string; dateTo: string },
	ctx: z.RefinementCtx
): void {
	if (val.dateFrom > val.dateTo) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'La fecha de inicio debe ser anterior a la fecha fin',
			path: ['dateFrom'],
		})
	}
}

export const leadsAnalyticsQuerySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		userIds: z.string().default(''),
	})
	.superRefine(refineDateOrder)
	.transform((val) => ({
		dateFrom: val.dateFrom,
		dateTo: val.dateTo,
		userIds: parseCommaIds(val.userIds === '' ? undefined : val.userIds),
	}))

export type LeadsAnalyticsQuery = z.infer<typeof leadsAnalyticsQuerySchema>

export const leadsAnalyticsCellQuerySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		userIds: z.string().default(''),
		idLeadFunnelColumn: z.coerce.number().int().positive().optional(),
		idUser: z.string().optional(),
		withBusiness: z.enum(['true', 'false']).optional(),
		outcomeStatus: z.enum(CELL_QUERY_OUTCOME_STATUSES).optional(),
	})
	.superRefine(refineDateOrder)
	.superRefine((val, ctx) => {
		if (val.idLeadFunnelColumn == null && val.withBusiness !== 'true') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Debe indicar una columna del funnel o withBusiness=true',
				path: ['idLeadFunnelColumn'],
			})
		}
	})
	.transform((val) => ({
		dateFrom: val.dateFrom,
		dateTo: val.dateTo,
		userIds: parseCommaIds(val.userIds === '' ? undefined : val.userIds),
		idLeadFunnelColumn: val.idLeadFunnelColumn ?? null,
		ownerFilter: parseCellOwnerFilter(val.idUser),
		withBusiness: val.withBusiness === 'true',
		outcomeStatus: val.outcomeStatus ?? null,
	}))

export type LeadsAnalyticsCellQuery = z.infer<
	typeof leadsAnalyticsCellQuerySchema
>
