/**
 * Builds a query string from a params object. Arrays become repeated keys;
 * undefined, null and empty values are skipped.
 */
export function buildQueryString(params: Record<string, unknown>): string {
	const searchParams = new URLSearchParams()

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			if (Array.isArray(value)) {
				value.forEach(item => {
					if (item !== undefined && item !== null && item !== '') {
						searchParams.append(key, String(item))
					}
				})
			} else {
				searchParams.append(key, String(value))
			}
		}
	})

	const queryString = searchParams.toString()
	return queryString ? `?${queryString}` : ''
}
