/**
 * Helpers for the role-based default date filter: when a user lands on the
 * negocios list without any date filter, the page seeds the URL with the
 * current month on the role's default date dimension so the advanced
 * filters Sheet and the active-filter badge reflect it.
 */

import { UserRole } from '@/features/auth/lib/roles'
import { bogotaDateOnly } from '@/features/negocios/lib/bogota-date'

const DATE_PARAM_KEYS = [
	'dateFrom',
	'dateTo',
	'createdFrom',
	'createdTo',
	'dateIssuedFrom',
	'dateIssuedTo',
] as const

export interface MonthRange {
	from: string
	to: string
}

/** First day of the current month through today, as Bogota YYYY-MM-DD strings. */
export function getCurrentMonthRange(now: Date = new Date()): MonthRange {
	const today = bogotaDateOnly(now)
	const [year, month] = today.split('-')
	return {
		from: `${year}-${month}-01`,
		to: today,
	}
}

/**
 * True when the URL already carries any advanced-filter date param
 * (even a partial pair), so the default seed never clobbers user input.
 */
export function hasAnyDateParam(searchParams: URLSearchParams): boolean {
	return DATE_PARAM_KEYS.some((key) => Boolean(searchParams.get(key)))
}

export interface DateParamPair {
	fromKey: 'dateFrom' | 'createdFrom'
	toKey: 'dateTo' | 'createdTo'
}

/**
 * Default date dimension per role: all mapped roles (AGENTE, PARTNER, ADMIN,
 * ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE) filter by creation date.
 * Roles not listed get no default.
 */
export function getDefaultDateParamPair(
	roleCode: string | undefined
): DateParamPair | null {
	switch (roleCode) {
		case UserRole.AGENTE:
		case UserRole.PARTNER:
		case UserRole.ADMIN:
		case UserRole.ASISTENTE_GERENCIA_OPERATIVA:
		case UserRole.ANALISTA_SOPORTE:
			return { fromKey: 'createdFrom', toKey: 'createdTo' }
		default:
			return null
	}
}

export type PageSearchParams = Record<string, string | string[] | undefined>

/** Next.js page `searchParams` as a URLSearchParams (repeated keys kept). */
export function toUrlSearchParams(searchParams: PageSearchParams): URLSearchParams {
	const params = new URLSearchParams()
	for (const [key, value] of Object.entries(searchParams)) {
		if (value === undefined) continue
		for (const item of Array.isArray(value) ? value : [value]) {
			params.append(key, item)
		}
	}
	return params
}

/**
 * Query string that seeds the role's default date filter (current month),
 * keeping every param already in the URL. Returns null when no seed applies:
 * the role has no default, or the URL already carries a date filter.
 *
 * Used by the negocios Server Component so the first render already has the
 * filter and the list is fetched once.
 */
export function buildDefaultDateSeedQuery(
	roleCode: string | undefined,
	searchParams: PageSearchParams,
	now: Date = new Date()
): string | null {
	const pair = getDefaultDateParamPair(roleCode)
	if (!pair) return null

	const params = toUrlSearchParams(searchParams)
	if (hasAnyDateParam(params)) return null

	const range = getCurrentMonthRange(now)
	params.set(pair.fromKey, range.from)
	params.set(pair.toKey, range.to)
	return params.toString()
}

const NEGOCIOS_PATH = '/dashboard/negocios'

/**
 * Edge-friendly version of the seed redirect for the negocios page: returns
 * the path (with query) to redirect to, or null when no redirect applies.
 *
 * Doing it in the middleware, before the page renders, lets a client-side
 * navigation follow the redirect inside its own request instead of rendering
 * the page, throwing `redirect()` and flashing a blank screen. `_rsc` is the
 * router's cache-busting param and must never end up in the seeded URL.
 */
export function buildNegociosSeedRedirectPath(
	pathname: string,
	method: string,
	roleCode: string | undefined,
	searchParams: URLSearchParams,
	now: Date = new Date()
): string | null {
	if (method !== 'GET' || pathname !== NEGOCIOS_PATH) return null

	const record: PageSearchParams = {}
	searchParams.forEach((value, key) => {
		if (key === '_rsc') return
		const current = record[key]
		record[key] =
			current === undefined
				? value
				: Array.isArray(current)
					? [...current, value]
					: [current, value]
	})

	const query = buildDefaultDateSeedQuery(roleCode, record, now)
	return query ? `${NEGOCIOS_PATH}?${query}` : null
}
