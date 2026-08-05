export type TextSegment =
	| { readonly type: 'text'; readonly value: string }
	| { readonly type: 'url'; readonly value: string; readonly href: string }

/** Matches http(s)://… or www.… runs of non-whitespace */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi

/** Punctuation commonly glued to the end of a URL inside prose */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/

/**
 * Splits plain text into text/url segments for safe React rendering.
 * Only http://, https://, and www. prefixes are treated as links.
 */
export function parseTextWithUrls(text: string): TextSegment[] {
	if (!text) return []

	const segments: TextSegment[] = []
	let lastIndex = 0
	const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags)

	for (const match of text.matchAll(regex)) {
		const raw = match[0]
		const start = match.index ?? 0

		if (start > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, start) })
		}

		const trailingMatch = raw.match(TRAILING_PUNCTUATION)
		const trailing = trailingMatch?.[0] ?? ''
		const urlValue = trailing ? raw.slice(0, -trailing.length) : raw
		const href = toSafeHref(urlValue)

		if (href && urlValue) {
			segments.push({ type: 'url', value: urlValue, href })
			if (trailing) {
				segments.push({ type: 'text', value: trailing })
			}
		} else {
			segments.push({ type: 'text', value: raw })
		}

		lastIndex = start + raw.length
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) })
	}

	return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function toSafeHref(raw: string): string | null {
	if (/^https?:\/\//i.test(raw)) {
		return raw
	}
	if (/^www\./i.test(raw)) {
		return `https://${raw}`
	}
	return null
}
