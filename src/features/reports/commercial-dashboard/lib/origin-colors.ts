/**
 * One color per origin, by its position in `report.origins` (biggest first),
 * so an origin keeps the same color in every chart and card.
 */

const ORIGIN_COLORS = [
	'#1d4ed8',
	'#059669',
	'#d97706',
	'#7c3aed',
	'#db2777',
	'#0891b2',
	'#65a30d',
	'#64748b',
] as const

export function originColor(origins: readonly { readonly origin: string }[], origin: string): string {
	const index = origins.findIndex((row) => row.origin === origin)
	return ORIGIN_COLORS[(index < 0 ? origins.length : index) % ORIGIN_COLORS.length]
}
