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
 * Default date dimension per role: AGENTE filters by creation date,
 * back-office roles by funding date. Roles not listed get no default.
 */
export function getDefaultDateParamPair(
	roleCode: string | undefined
): DateParamPair | null {
	switch (roleCode) {
		case UserRole.AGENTE:
			return { fromKey: 'createdFrom', toKey: 'createdTo' }
		case UserRole.ADMIN:
		case UserRole.ASISTENTE_GERENCIA_OPERATIVA:
		case UserRole.ANALISTA_SOPORTE:
			return { fromKey: 'dateFrom', toKey: 'dateTo' }
		default:
			return null
	}
}
