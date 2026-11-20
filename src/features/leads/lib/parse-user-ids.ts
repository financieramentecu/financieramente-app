/** Positive integer ids from repeated query values, in first-seen order. */
export function parseRepeatedUserIds(values: Iterable<string>): number[] {
	const ids: number[] = []
	const seen = new Set<number>()
	for (const value of values) {
		const parsed = Number.parseInt(value, 10)
		if (!Number.isSafeInteger(parsed) || parsed <= 0 || seen.has(parsed)) continue
		seen.add(parsed)
		ids.push(parsed)
	}
	return ids
}
