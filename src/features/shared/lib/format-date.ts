const BOGOTA_TZ = 'America/Bogota'

export function formatDateBogota(
	iso: string | Date | null | undefined,
	style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium'
): string {
	if (!iso) return '—'
	let input: string | Date
	if (typeof iso === 'string') {
		// Date-only strings (YYYY-MM-DD) have no timezone — anchor at noon UTC to
		// prevent midnight UTC rolling back one day in Bogotá (UTC-5).
		// Full datetime strings must be parsed as-is so the Bogotá calendar day is
		// derived from the actual timestamp, not from the UTC date portion.
		input = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso
	} else {
		input = iso
	}
	return new Date(input).toLocaleDateString('es-CO', {
		dateStyle: style,
		timeZone: BOGOTA_TZ,
	})
}

/**
 * Formats a timestamp as a Bogotá date and time (es-CO, "29 sept 2026, 9:30 p. m.").
 * The calendar day and hour are always derived in America/Bogota, so the result
 * does not depend on the browser or server timezone. Returns '—' for empty or
 * invalid input.
 */
export function formatDateTimeBogota(
	iso: string | Date | null | undefined
): string {
	if (!iso) return '—'
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return '—'
	return date.toLocaleString('es-CO', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: BOGOTA_TZ,
	})
}
