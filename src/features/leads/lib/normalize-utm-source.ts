const UTM_SOURCE_MAX_LENGTH = 120

/**
 * Stable catalogue key for a landing-page `utm_source`.
 * "Money Map", "money-map" and "money_map" share one code.
 * Returns null when the value has no usable characters.
 */
export function normalizeUtmSource(raw: string): string | null {
	const code = raw
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, UTM_SOURCE_MAX_LENGTH)

	return code === '' ? null : code
}

/**
 * Display label stored the first time a code is seen.
 * A readable incoming value is kept; a bare slug is title-cased.
 */
export function leadOriginLabel(raw: string, code: string): string {
	const trimmed = raw.trim().slice(0, UTM_SOURCE_MAX_LENGTH)
	if (normalizeUtmSource(trimmed) !== trimmed) {
		return trimmed
	}

	return code
		.split('_')
		.filter((word) => word !== '')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
		.slice(0, UTM_SOURCE_MAX_LENGTH)
}
