const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const HOURS_BEFORE_DAYS = 48

/** Spanish duration for a stage stay: minutes, then hours, then days. */
export function formatStageDuration(durationMs: number): string {
	const minutes = Math.floor(Math.max(0, durationMs) / MS_PER_MINUTE)
	if (minutes < 1) return 'menos de 1 min'
	if (minutes < 60) return `${minutes} min`

	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60
	if (hours < HOURS_BEFORE_DAYS) {
		return remainingMinutes === 0
			? `${hours} h`
			: `${hours} h ${remainingMinutes} min`
	}

	const days = Math.floor(durationMs / MS_PER_DAY)
	const remainingHours = Math.floor((durationMs % MS_PER_DAY) / MS_PER_HOUR)
	const dayLabel = days === 1 ? '1 día' : `${days} días`
	return remainingHours === 0 ? dayLabel : `${dayLabel} ${remainingHours} h`
}
