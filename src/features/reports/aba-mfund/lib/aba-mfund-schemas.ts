import { z } from 'zod'
import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import type { AbaMfundDetailCursor } from '../types/aba-mfund.types'

const isoDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser YYYY-MM-DD')

const BUSINESS_STATUS_VALUES = [
	BUSINESS_STATUS.VENTA_EFECTUADA,
	BUSINESS_STATUS.EMITIDO,
	BUSINESS_STATUS.LIQUIDADO,
	BUSINESS_STATUS.CANCELADO,
	BUSINESS_STATUS.FONDEADO,
	BUSINESS_STATUS.CARTERA,
] as const

const statusSchema = z.enum(BUSINESS_STATUS_VALUES)

function parseCommaIds(raw: string | undefined): number[] {
	if (!raw || raw.trim() === '') return []
	const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
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

function parseCommaStatuses(raw: string | undefined): BusinessStatus[] {
	if (!raw || raw.trim() === '') return []
	const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
	const out: BusinessStatus[] = []
	for (const part of parts) {
		const parsed = statusSchema.safeParse(part)
		if (!parsed.success) {
			throw new Error(`Estado inválido: ${part}`)
		}
		out.push(parsed.data)
	}
	return out
}

export const detailCursorSchema = z.object({
	createdAt: z.string().min(1),
	idBusiness: z.number().int().positive(),
})

export function encodeDetailCursor(cursor: AbaMfundDetailCursor): string {
	return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeDetailCursor(
	raw: string | null | undefined
): AbaMfundDetailCursor | null {
	if (!raw) return null
	try {
		const json = Buffer.from(raw, 'base64url').toString('utf8')
		const parsed = detailCursorSchema.safeParse(JSON.parse(json))
		if (!parsed.success) return null
		return {
			createdAt: parsed.data.createdAt,
			idBusiness: parsed.data.idBusiness,
		}
	} catch {
		return null
	}
}

function refineDateOrder(
	val: { dateFrom: string; dateTo: string },
	ctx: z.RefinementCtx
): void {
	if (val.dateFrom > val.dateTo) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'dateFrom no puede ser posterior a dateTo',
			path: ['dateFrom'],
		})
	}
}

/**
 * Shared GET query shape for KPI, ranking, and detail endpoints.
 * `userIds` / `statuses` may be empty → services short-circuit or omit predicates.
 */
export const abaMfundQuerySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		userIds: z.string().default(''),
		statuses: z.string().optional(),
		cursor: z.string().optional(),
		limit: z.coerce.number().int().min(1).max(100).default(50),
	})
	.superRefine(refineDateOrder)
	.transform((val) => {
		const userIds = parseCommaIds(val.userIds === '' ? undefined : val.userIds)
		const statuses = parseCommaStatuses(val.statuses)
		const cursor = decodeDetailCursor(val.cursor)

		return {
			dateFrom: val.dateFrom,
			dateTo: val.dateTo,
			userIds,
			statuses,
			cursor,
			limit: val.limit,
		}
	})

export type AbaMfundQueryParsed = z.infer<typeof abaMfundQuerySchema>

/**
 * POST body for Excel export — same filter contract as screen / GET APIs.
 */
export const abaMfundExportBodySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		userIds: z.array(z.number().int().positive()).default([]),
		statuses: z.array(statusSchema).default([]),
	})
	.superRefine(refineDateOrder)
	.transform((val) => ({
		dateFrom: val.dateFrom,
		dateTo: val.dateTo,
		userIds: val.userIds,
		statuses: val.statuses,
	}))

export type AbaMfundExportBodyParsed = z.infer<typeof abaMfundExportBodySchema>
