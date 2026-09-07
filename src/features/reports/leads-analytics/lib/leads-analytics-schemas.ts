/**
 * Zod query contract for Leads Analytics report APIs.
 */

import { z } from 'zod'
import { parseCellOwnerFilter } from './cell-owner-filter'

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
		idLeadFunnelColumn: z.coerce.number().int().positive(),
		idUser: z.string().optional(),
	})
	.superRefine(refineDateOrder)
	.transform((val) => ({
		dateFrom: val.dateFrom,
		dateTo: val.dateTo,
		userIds: parseCommaIds(val.userIds === '' ? undefined : val.userIds),
		idLeadFunnelColumn: val.idLeadFunnelColumn,
		ownerFilter: parseCellOwnerFilter(val.idUser),
	}))

export type LeadsAnalyticsCellQuery = z.infer<
	typeof leadsAnalyticsCellQuerySchema
>
