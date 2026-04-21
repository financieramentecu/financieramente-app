/**
 * Shared formatting helpers for "Mis distribuciones" feature.
 */

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('es-EC', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	}).format(value)
}

export function formatPct(value: number): string {
	// Values stored as fractions (0.05 = 5%). Accept both shapes to be safe.
	const pct = Math.abs(value) <= 1 ? value * 100 : value
	return `${pct.toFixed(2)}%`
}

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—'
	try {
		return new Intl.DateTimeFormat('es-EC', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(new Date(iso))
	} catch {
		return iso
	}
}

const MONTH_NAME_BY_NUMBER: Record<string, string> = {
	'01': 'Enero',
	'02': 'Febrero',
	'03': 'Marzo',
	'04': 'Abril',
	'05': 'Mayo',
	'06': 'Junio',
	'07': 'Julio',
	'08': 'Agosto',
	'09': 'Septiembre',
	'10': 'Octubre',
	'11': 'Noviembre',
	'12': 'Diciembre',
}

/**
 * Turn a `YYYY-MM` periodo into a human-friendly label ("Abril 2026").
 * Falls back to the raw string when format is unexpected.
 */
export function formatPeriodo(periodo: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(periodo)
	if (!match) return periodo
	const [, year, month] = match
	const name = MONTH_NAME_BY_NUMBER[month] ?? month
	return `${name} ${year}`
}
