const BOGOTA_TZ = 'America/Bogota'

/**
 * Returns the current calendar day in America/Bogota as a UTC Date
 * (midnight UTC of that Bogota day).
 * Accepts an injectable `now` for deterministic testing.
 */
export function todayBogota(now: Date = new Date()): Date {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: BOGOTA_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	const parts = formatter.formatToParts(now)
	const year = parts.find(p => p.type === 'year')!.value
	const month = parts.find(p => p.type === 'month')!.value
	const day = parts.find(p => p.type === 'day')!.value
	return new Date(`${year}-${month}-${day}T00:00:00Z`)
}

/**
 * Converts a date-only string (YYYY-MM-DD) to a Date anchored at noon UTC.
 * Date-only strings have no timezone of their own — anchoring at midnight
 * UTC rolls back to the previous calendar day in Bogota (UTC-5), and
 * anchoring without an explicit "Z" makes the result depend on whatever
 * local timezone happens to run the parsing (browser or server).
 * Noon UTC (= 07:00 Bogota) stays within the same calendar day regardless
 * of where it's parsed, so this is the single safe anchor for the whole app.
 */
export function dateOnlyToBogotaNoonUtc(dateOnly: string): Date {
	return new Date(`${dateOnly}T12:00:00Z`)
}

/**
 * Inverse of dateOnlyToBogotaNoonUtc: derives the 'YYYY-MM-DD' calendar day
 * a Date falls on in America/Bogota, regardless of the runtime's local
 * timezone. Use this instead of `.getFullYear()/.getMonth()/.getDate()`
 * (which read the runtime's local time) when round-tripping a business
 * date back into a date-only string (e.g. URL filter params).
 */
export function bogotaDateOnly(d: Date): string {
	return d.toLocaleDateString('en-CA', { timeZone: BOGOTA_TZ })
}

/**
 * Returns the 'YYYY-MM' string for the given date in America/Bogota timezone.
 */
export function bogotaYearMonth(d: Date): string {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: BOGOTA_TZ,
		year: 'numeric',
		month: '2-digit',
	})
	const parts = formatter.formatToParts(d)
	const year = parts.find(p => p.type === 'year')!.value
	const month = parts.find(p => p.type === 'month')!.value
	return `${year}-${month}`
}

/**
 * Returns true when the reference month/year (from `ref` ISO date string)
 * is the same as or after the current Bogota calendar month.
 * Returns false when ref is null.
 */
export function isSameMonthOrFuture(ref: string | null, now: Date): boolean {
	if (!ref) return false
	const refYearMonth = ref.slice(0, 7)
	const nowYearMonth = bogotaYearMonth(now)
	return refYearMonth >= nowYearMonth
}

/**
 * Returns true when the reference month/year (from `ref` ISO date string)
 * is strictly AFTER the current Bogota calendar month.
 * Returns false when ref is null or same month.
 */
export function isStrictlyFutureMonth(ref: string | null, now: Date): boolean {
	if (!ref) return false
	const refYearMonth = ref.slice(0, 7)
	const nowYearMonth = bogotaYearMonth(now)
	return refYearMonth > nowYearMonth
}
