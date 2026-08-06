import { z } from 'zod'
import {
	CONTRIBUTION_TYPE,
	CURRENCY_MODE,
	type ProduccionRealDetailCursor,
} from '../types/produccion-real.types'

const isoDaySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser YYYY-MM-DD')

const currencyModeSchema = z.enum([
	CURRENCY_MODE.ALL_TRM,
	CURRENCY_MODE.FOREIGN,
	CURRENCY_MODE.COP,
])

const contributionTypeSchema = z.enum([
	CONTRIBUTION_TYPE.REGULAR,
	CONTRIBUTION_TYPE.UNICO,
])

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

function parseContributionTypes(
	raw: string | undefined
): Array<'REGULAR' | 'UNICO'> {
	if (!raw || raw.trim() === '') return []
	const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
	const out: Array<'REGULAR' | 'UNICO'> = []
	for (const part of parts) {
		const parsed = contributionTypeSchema.safeParse(part)
		if (!parsed.success) {
			throw new Error(`Tipo de aporte inválido: ${part}`)
		}
		out.push(parsed.data)
	}
	return out
}

export const detailCursorSchema = z.object({
	createdAt: z.string().min(1),
	idBusiness: z.number().int().positive(),
})

export function encodeDetailCursor(cursor: ProduccionRealDetailCursor): string {
	return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeDetailCursor(
	raw: string | null | undefined
): ProduccionRealDetailCursor | null {
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

/**
 * Shared query shape for KPI + detail endpoints.
 * `userIds` may be empty (hierarchy cleared) → services short-circuit to zeros/empty.
 */
export const produccionRealQuerySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		contributionTypes: z.string().optional(),
		companyIds: z.string().optional(),
		currencyMode: currencyModeSchema.default(CURRENCY_MODE.ALL_TRM),
		userIds: z.string().default(''),
		trmRate: z.coerce.number().positive().optional(),
		cursor: z.string().optional(),
		limit: z.coerce.number().int().min(1).max(100).default(50),
	})
	.superRefine((val, ctx) => {
		if (val.dateFrom > val.dateTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'dateFrom no puede ser posterior a dateTo',
				path: ['dateFrom'],
			})
		}
	})
	.transform((val) => {
		const userIds = parseCommaIds(val.userIds === '' ? undefined : val.userIds)
		const companyIds = parseCommaIds(val.companyIds)
		const contributionTypes = parseContributionTypes(val.contributionTypes)
		const cursor = decodeDetailCursor(val.cursor)

		return {
			dateFrom: val.dateFrom,
			dateTo: val.dateTo,
			contributionTypes,
			companyIds,
			currencyMode: val.currencyMode,
			userIds,
			trmRate: val.trmRate ?? null,
			cursor,
			limit: val.limit,
		}
	})

export type ProduccionRealQueryParsed = z.infer<typeof produccionRealQuerySchema>

/**
 * POST body for Excel export — same filter contract as screen / GET APIs.
 */
export const produccionRealExportBodySchema = z
	.object({
		dateFrom: isoDaySchema,
		dateTo: isoDaySchema,
		contributionTypes: z.array(contributionTypeSchema).default([]),
		companyIds: z.array(z.number().int().positive()).default([]),
		currencyMode: currencyModeSchema.default(CURRENCY_MODE.ALL_TRM),
		userIds: z.array(z.number().int().positive()).default([]),
		trmRate: z.number().positive().nullable().optional(),
	})
	.superRefine((val, ctx) => {
		if (val.dateFrom > val.dateTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'dateFrom no puede ser posterior a dateTo',
				path: ['dateFrom'],
			})
		}
	})
	.transform((val) => ({
		dateFrom: val.dateFrom,
		dateTo: val.dateTo,
		contributionTypes: val.contributionTypes,
		companyIds: val.companyIds,
		currencyMode: val.currencyMode,
		userIds: val.userIds,
		trmRate: val.trmRate ?? null,
	}))

export type ProduccionRealExportBodyParsed = z.infer<
	typeof produccionRealExportBodySchema
>
