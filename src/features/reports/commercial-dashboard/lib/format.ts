import { COMMERCIAL_DASHBOARD_UI } from './ui-copy'

/** "+12%" / "−8%" change vs the previous value; null when there is no base. */
export function formatChange(current: number, previous: number): string | null {
	if (previous === 0) return null
	const pct = Math.round(((current - previous) / previous) * 100)
	return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`
}

/** Compact amount for a money column: "12,3 M"; "0" when nothing was funded. */
export function formatMoney(value: number): string {
	return new Intl.NumberFormat('es-CO', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(value)
}

/** "59%" or an em dash when the denominator is 0 or the value is unknown. */
export function formatRatio(part: number | null, total: number): string {
	if (part === null || total === 0) return COMMERCIAL_DASHBOARD_UI.NO_DATA
	return `${Math.round((part / total) * 100)}%`
}
