const WORD_SEPARATOR_REGEX = /\s+/g
const DIACRITICS_REGEX = /[\u0300-\u036f]/g
const MULTI_SPACE_REGEX = /\s+/g
const WORD_BOUNDARY_TEMPLATE = (word: string) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i')

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitWords(normalizedValue: string): string[] {
	return normalizedValue.split(WORD_SEPARATOR_REGEX).filter(Boolean)
}

export function normalizeHeaderValue(value: string | null | undefined): string {
	return String(value ?? '')
		.normalize('NFD')
		.replace(DIACRITICS_REGEX, '')
		.toLowerCase()
		.trim()
		.replace(MULTI_SPACE_REGEX, ' ')
}

export function normalizeHeaders(headers: readonly string[]): string[] {
	return headers.map((header) => normalizeHeaderValue(header))
}

export function headerMatchesRequired(
	header: string,
	requiredHeader: string
): boolean {
	const normalizedHeader = normalizeHeaderValue(header)
	const normalizedRequired = normalizeHeaderValue(requiredHeader)

	if (!normalizedHeader || !normalizedRequired) return false
	if (normalizedHeader === normalizedRequired) return true

	const requiredWords = splitWords(normalizedRequired)

	if (requiredWords.length === 1) {
		return WORD_BOUNDARY_TEMPLATE(requiredWords[0]).test(normalizedHeader)
	}

	let lastIndex = -1
	for (const word of requiredWords) {
		const wordIndex = normalizedHeader.indexOf(word)
		if (wordIndex === -1 || wordIndex < lastIndex) {
			return false
		}
		lastIndex = wordIndex
	}

	return true
}

export function findHeaderIndex(
	headers: readonly string[],
	requiredHeader: string
): number {
	for (let index = 0; index < headers.length; index += 1) {
		if (headerMatchesRequired(headers[index], requiredHeader)) {
			return index
		}
	}

	return -1
}

export function findMissingHeaders(
	headers: readonly string[],
	requiredHeaders: readonly string[]
): string[] {
	const missing: string[] = []

	for (const requiredHeader of requiredHeaders) {
		if (findHeaderIndex(headers, requiredHeader) === -1) {
			missing.push(requiredHeader)
		}
	}

	return missing
}
