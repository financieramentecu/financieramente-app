import { z } from 'zod'
import type { LeadOutcomeStatus } from '@prisma/client'
import { LEAD_OUTCOME_STATUS_VALUES } from '@/features/leads/types/lead.types'

export const LEAD_TABLE_SORTS = ['createdAt', 'lastActivityAt', 'name', 'estimatedValue', 'probability'] as const
export type LeadTableSort = (typeof LEAD_TABLE_SORTS)[number]
export type LeadTableSortDirection = 'asc' | 'desc'

export const LEAD_TABLE_PAGE_SIZES = { min: 10, max: 100, default: 25 } as const

export interface LeadTableQuery {
	q?: string
	statuses: LeadOutcomeStatus[]
	stageIds: number[]
	ownerIds: number[]
	tagIds: number[]
	/** Bogotá `YYYY-MM-DD`, inclusive; always sent together with `to`. */
	from?: string
	to?: string
	idle: boolean
	sort: LeadTableSort
	dir: LeadTableSortDirection
	page: number
	pageSize: number
}

export type LeadTableQueryResult = { ok: true; query: LeadTableQuery } | { ok: false; error: string }

export const DEFAULT_LEAD_TABLE_QUERY: LeadTableQuery = {
	statuses: [],
	stageIds: [],
	ownerIds: [],
	tagIds: [],
	idle: false,
	sort: 'createdAt',
	dir: 'desc',
	page: 1,
	pageSize: LEAD_TABLE_PAGE_SIZES.default,
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const positiveId = z.coerce.number().int().positive().max(2_147_483_647)

const leadTableQuerySchema = z
	.object({
		q: z
			.string()
			.trim()
			.max(100, 'La búsqueda admite máximo 100 caracteres')
			.optional()
			.transform((value) => (value ? value : undefined)),
		statuses: z.array(z.enum(LEAD_OUTCOME_STATUS_VALUES as [LeadOutcomeStatus, ...LeadOutcomeStatus[]])).default([]),
		stageIds: z.array(positiveId).default([]),
		ownerIds: z.array(positiveId).default([]),
		tagIds: z.array(positiveId).default([]),
		from: z.string().regex(ISO_DAY, 'Fecha inválida').optional(),
		to: z.string().regex(ISO_DAY, 'Fecha inválida').optional(),
		idle: z.boolean().default(false),
		sort: z.enum(LEAD_TABLE_SORTS).default('createdAt'),
		dir: z.enum(['asc', 'desc']).default('desc'),
		page: z.coerce.number().int().min(1).max(100_000).default(1),
		pageSize: z.coerce
			.number()
			.int()
			.min(LEAD_TABLE_PAGE_SIZES.min)
			.max(LEAD_TABLE_PAGE_SIZES.max)
			.default(LEAD_TABLE_PAGE_SIZES.default),
	})
	.refine((value) => Boolean(value.from) === Boolean(value.to), { message: 'El rango de fechas requiere inicio y fin' })
	.refine((value) => !value.from || !value.to || value.from <= value.to, {
		message: 'La fecha inicial no puede ser posterior a la final',
	})

function toResult(parsed: ReturnType<typeof leadTableQuerySchema.safeParse>): LeadTableQueryResult {
	if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Filtros inválidos' }
	const { q, from, to, ...rest } = parsed.data
	const query: LeadTableQuery = { ...rest }
	if (q) query.q = q
	if (from && to) {
		query.from = from
		query.to = to
	}
	return { ok: true, query }
}

/** Table query from `?q=&status=&stage=&owner=&tag=&from=&to=&idle=1&sort=&dir=&page=&pageSize=`. */
export function parseLeadTableQuery(params: URLSearchParams): LeadTableQueryResult {
	const optional = (key: string) => params.get(key) ?? undefined
	return toResult(
		leadTableQuerySchema.safeParse({
			q: optional('q'),
			statuses: params.getAll('status'),
			stageIds: params.getAll('stage'),
			ownerIds: params.getAll('owner'),
			tagIds: params.getAll('tag'),
			from: optional('from'),
			to: optional('to'),
			idle: params.get('idle') === '1',
			sort: optional('sort'),
			dir: optional('dir'),
			page: optional('page'),
			pageSize: optional('pageSize'),
		})
	)
}

/** Query stored in a saved view (JSON). Paging is never stored. */
export function parseSavedLeadTableQuery(value: unknown): LeadTableQueryResult {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return { ok: false, error: 'Vista inválida' }
	}
	return toResult(leadTableQuerySchema.safeParse({ ...value, page: undefined, pageSize: undefined }))
}

/** Saved-view payload: the query without paging. */
export function toSavedLeadTableQuery(query: LeadTableQuery): Omit<LeadTableQuery, 'page' | 'pageSize'> {
	const saved: Partial<LeadTableQuery> = { ...query }
	delete saved.page
	delete saved.pageSize
	return saved as Omit<LeadTableQuery, 'page' | 'pageSize'>
}

/** URL params for a query, omitting every default value. */
export function toLeadTableSearchParams(query: LeadTableQuery): URLSearchParams {
	const params = new URLSearchParams()
	const defaults = DEFAULT_LEAD_TABLE_QUERY
	if (query.q) params.set('q', query.q)
	query.statuses.forEach((value) => params.append('status', value))
	query.stageIds.forEach((value) => params.append('stage', String(value)))
	query.ownerIds.forEach((value) => params.append('owner', String(value)))
	query.tagIds.forEach((value) => params.append('tag', String(value)))
	if (query.from && query.to) {
		params.set('from', query.from)
		params.set('to', query.to)
	}
	if (query.idle) params.set('idle', '1')
	if (query.sort !== defaults.sort) params.set('sort', query.sort)
	if (query.dir !== defaults.dir) params.set('dir', query.dir)
	if (query.page !== defaults.page) params.set('page', String(query.page))
	if (query.pageSize !== defaults.pageSize) params.set('pageSize', String(query.pageSize))
	return params
}
