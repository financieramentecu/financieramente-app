/**
 * Fills `utm_source` from the request query string when the JSON body
 * omits it or sends it blank. A non-empty body value wins.
 */
export function mergeUtmSource(body: unknown, queryUtm: string | null): unknown {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return body
	}

	const record = body as Record<string, unknown>
	const bodyUtm = record.utm_source
	const bodyHasValue = typeof bodyUtm === 'string' && bodyUtm.trim() !== ''
	if (bodyHasValue || queryUtm === null || queryUtm.trim() === '') {
		return body
	}

	return { ...record, utm_source: queryUtm }
}
