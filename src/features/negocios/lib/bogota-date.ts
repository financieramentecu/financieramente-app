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
