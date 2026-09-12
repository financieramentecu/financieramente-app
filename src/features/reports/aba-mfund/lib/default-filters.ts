/**
 * Default ABA-MFUND filters: current Bogotá month, Estado Todos.
 * Jerarquía Toda is the hierarchy provider default (not part of this draft).
 */

import { TZDate } from '@date-fns/tz'
import { BOGOTA_TZ } from '@/features/shared/lib/bogota-date-range'
import type { AbaMfundFilters } from '../types/aba-mfund.types'
import type { AbaMfundFilterDraft } from '../types/filter.types'

/**
 * Returns current Bogotá calendar month as YYYY-MM-DD inclusive bounds.
 */
export function currentBogotaMonthDateStrings(
	now: Date = new Date()
): { dateFrom: string; dateTo: string } {
	const bogotaNow = new TZDate(now, BOGOTA_TZ)
	const year = bogotaNow.getFullYear()
	const month = bogotaNow.getMonth()
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
	const monthStr = String(month + 1).padStart(2, '0')
	return {
		dateFrom: `${year}-${monthStr}-01`,
		dateTo: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
	}
}

/**
 * Spec defaults: current Bogotá month, Estado Todos (empty statuses).
 * Note: `userIds` come from hierarchy selection — not part of filter defaults.
 */
export function buildDefaultAbaMfundFilters(
	now: Date = new Date()
): AbaMfundFilterDraft {
	const { dateFrom, dateTo } = currentBogotaMonthDateStrings(now)
	return {
		dateFrom,
		dateTo,
		statuses: [],
	}
}

/**
 * Builds a full filters object once hierarchy userIds are known.
 */
export function toAbaMfundFilters(
	draft: AbaMfundFilterDraft,
	userIds: readonly number[]
): AbaMfundFilters {
	return {
		dateFrom: draft.dateFrom,
		dateTo: draft.dateTo,
		statuses: draft.statuses,
		userIds,
	}
}
