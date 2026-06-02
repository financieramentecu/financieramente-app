const BOGOTA_TZ = 'America/Bogota'

export function formatDateBogota(
	iso: string | Date | null | undefined,
	style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium'
): string {
	if (!iso) return '—'
	let input: string | Date
	if (typeof iso === 'string') {
		const dateMatch = iso.match(/^(\d{4}-\d{2}-\d{2})/)
		input = dateMatch ? `${dateMatch[1]}T12:00:00Z` : iso
	} else {
		input = iso
	}
	return new Date(input).toLocaleDateString('es-CO', {
		dateStyle: style,
		timeZone: BOGOTA_TZ,
	})
}
