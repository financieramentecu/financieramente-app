/** Reads `lead:12` / `column:3` ids produced by the pipeline drag and drop. */
export function parsePrefixedId(value: unknown, prefix: string): number | null {
	if (typeof value !== 'string' && typeof value !== 'number') return null
	const text = String(value)
	if (!text.startsWith(prefix)) return null
	const parsed = Number.parseInt(text.slice(prefix.length), 10)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
