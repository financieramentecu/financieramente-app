import { getAppLocale } from '@/features/shared/lib/app-locale'

/** Decimal separator for `locale` (e.g. `,` for es-CO). */
export function getDecimalSeparator(locale: string): string {
	const parts = new Intl.NumberFormat(locale).formatToParts(1.1)
	const dec = parts.find((p) => p.type === 'decimal')
	return dec?.value ?? '.'
}

export function isCommaDecimalLocale(locale: string): boolean {
	return getDecimalSeparator(locale) === ','
}

/**
 * Parse pasted or blurred percent text into a 0–100 scale number.
 * Supports `12,5 %`, `12.5%`, thousands dots for es-CO.
 */
export function parsePercentPaste(raw: string, locale: string): number | null {
	const cleaned = raw.trim().replace(/%/g, '').replace(/\s/g, '')
	if (!cleaned) return null

	let normalized = cleaned
	if (isCommaDecimalLocale(locale)) {
		normalized = normalized.replace(/\./g, '').replace(',', '.')
	} else {
		normalized = normalized.replace(/,/g, '')
	}

	const n = Number(normalized)
	if (!Number.isFinite(n)) return null
	return n
}

/**
 * Normalizes pasted text to a display string for the input (no `%`), locale-aware, max 4 dp.
 */
export function normalizePercentPaste(raw: string, locale: string): string {
	const n = parsePercentPaste(raw, locale)
	if (n === null) return ''
	const formatter = new Intl.NumberFormat(locale, {
		useGrouping: false,
		maximumFractionDigits: 4,
		minimumFractionDigits: 0,
	})
	return formatter.format(n).replace(/\u00a0/g, '')
}

/**
 * Read-only percent on 0–100 scale: up to 6 fraction digits, no trailing zeros; trailing `%`.
 */
export function formatPercentDisplay(
	percent0to100: number,
	locale: string = getAppLocale()
): string {
	if (!Number.isFinite(percent0to100)) {
		return '0%'
	}

	const rounded = Math.round(percent0to100 * 1e6) / 1e6
	const formatter = new Intl.NumberFormat(locale, {
		useGrouping: false,
		minimumFractionDigits: 0,
		maximumFractionDigits: 6,
	})

	return `${formatter.format(rounded).replace(/\u00a0/g, '')}%`
}

/** `fraction` in 0–1 (e.g. DB `porcentaje_distribucion`) → same display as `formatPercentDisplay`. */
export function formatPercentFromFraction(
	fraction: number,
	locale: string = getAppLocale()
): string {
	if (!Number.isFinite(fraction)) {
		return formatPercentDisplay(0, locale)
	}
	return formatPercentDisplay(fraction * 100, locale)
}

export function formatNumberForPercentInput(
	value: number,
	locale: string = getAppLocale()
): string {
	const formatter = new Intl.NumberFormat(locale, {
		useGrouping: false,
		maximumFractionDigits: 4,
		minimumFractionDigits: 0,
	})
	return formatter.format(value).replace(/\u00a0/g, '')
}
