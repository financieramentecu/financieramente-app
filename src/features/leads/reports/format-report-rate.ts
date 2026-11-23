const oneDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

/** Fraction (0..1) as a Spanish percentage, e.g. `0.3333` → `33,3 %`; '—' when null. */
export function formatReportRate(rate: number | null): string {
	return rate === null ? '—' : `${oneDecimal.format(rate * 100)} %`
}

/** Days with at most one decimal, e.g. `2.5` → `2,5`; '—' when null. */
export function formatReportDays(days: number | null): string {
	return days === null ? '—' : oneDecimal.format(days)
}
