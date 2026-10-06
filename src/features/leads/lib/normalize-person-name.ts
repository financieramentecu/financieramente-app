/**
 * Diacritic-stripping normalization for person full names
 * (`propietario_nombre` owner-fallback matching). Distinct from
 * `normalize-funnel-status-key.ts` (uppercase + underscore, shape-wrong for
 * names): NFD-decomposes accented characters, strips the combining marks
 * (U+0300–U+036F, e.g. "España" -> "Espana"), lowercases, then collapses
 * whitespace.
 */
const COMBINING_MARKS = /[̀-ͯ]/g

export function normalizePersonName(value: string): string {
	return value
		.normalize('NFD')
		.replace(COMBINING_MARKS, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
}
