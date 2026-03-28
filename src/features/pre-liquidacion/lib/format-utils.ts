/**
 * Shared formatting utilities for pre-liquidación tables and modals.
 * Currency uses es-CO locale (Colombian peso conventions: dot as thousands separator).
 */

const currencyFormatter = new Intl.NumberFormat('es-CO', {
	style: 'currency',
	currency: 'COP',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
	currencyDisplay: 'narrowSymbol',
})

const numberFormatter = new Intl.NumberFormat('es-CO', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
})

/** Formats a number as COP currency: $50.000 */
export function formatCurrency(value: number): string {
	return currencyFormatter.format(value)
}

/** Formats a plain number with thousand separators: 1.234 */
export function formatNumber(value: number): string {
	return numberFormatter.format(value)
}

/** Formats a decimal fraction as a percentage: 0.12 → 12% */
export function formatPct(value: number): string {
	return `${numberFormatter.format(value * 100)}%`
}

/** Formats an ISO date string to a readable short date: 2026-03-28 → 28 mar 2026 */
export function formatDate(isoString: string | null | undefined): string {
	if (!isoString) return '—'
	const date = new Date(isoString)
	if (isNaN(date.getTime())) return '—'
	return date.toLocaleDateString('es-CO', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC',
	})
}
