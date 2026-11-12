const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

/** COP amount from a decimal string; '—' when empty. */
export function formatLeadAmount(value: string | null): string {
	if (value === null || value === '') return '—'
	const amount = Number(value)
	return Number.isFinite(amount) ? cop.format(amount) : '—'
}
