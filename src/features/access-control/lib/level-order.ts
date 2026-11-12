export interface LevelLink {
	readonly code: string
	readonly nextCode: string | null
}

/**
 * Level codes ordered from lowest to highest, following `nextCode`.
 * Levels outside the chain (e.g. PARTNER_EXTERNAL: nothing points to it and
 * it points to nothing) are left out, so they never satisfy a minimum level.
 */
export function buildLevelOrder(levels: readonly LevelLink[]): string[] {
	const pointedTo = new Set(
		levels.map((l) => l.nextCode).filter((c): c is string => c !== null)
	)
	const nextByCode = new Map(levels.map((l) => [l.code, l.nextCode]))
	const head = levels.find((l) => l.nextCode !== null && !pointedTo.has(l.code))
	if (!head) return []

	const order: string[] = []
	const seen = new Set<string>()
	let current: string | null = head.code
	while (current !== null && !seen.has(current) && nextByCode.has(current)) {
		seen.add(current)
		order.push(current)
		current = nextByCode.get(current) ?? null
	}
	return order
}
