/** America/Bogota is UTC-5 all year (no DST). */
const BOGOTA_OFFSET = '-05:00'

/**
 * Converts a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm"),
 * read as Bogotá wall-clock time, to an ISO instant. Never relies on the
 * browser's own timezone. Returns null for empty or malformed input.
 */
export function bogotaLocalDateTimeToIso(value: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
	const date = new Date(`${value}:00${BOGOTA_OFFSET}`)
	return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
