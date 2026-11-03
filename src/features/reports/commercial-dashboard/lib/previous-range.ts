import type { CommercialDateRange } from '../types/commercial-dashboard.types'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const toIsoDay = (t: number) => new Date(t).toISOString().slice(0, 10)

/**
 * The range of the same length that ends the day before `range` starts.
 * 1–31 Oct (31 days) → 31 Aug–30 Sep.
 */
export function previousRange(range: CommercialDateRange): CommercialDateRange {
	const from = Date.parse(`${range.dateFrom}T00:00:00Z`)
	const to = Date.parse(`${range.dateTo}T00:00:00Z`)
	const days = Math.round((to - from) / ONE_DAY_MS) + 1
	return {
		dateFrom: toIsoDay(from - days * ONE_DAY_MS),
		dateTo: toIsoDay(from - ONE_DAY_MS),
	}
}
