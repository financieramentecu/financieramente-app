export interface LeaderLink {
	idUser: number
	idUserLeader: number | null
}

const MAX_DEPTH = 32

/**
 * Roots plus every user under them, following `idUserLeader`.
 * People who do not hang off a root stay out, including siblings the hierarchy
 * tree never draws. Depth is capped so a cycle cannot loop forever.
 */
export function descendantClosure(roots: readonly number[], links: readonly LeaderLink[]): number[] {
	const children = new Map<number, number[]>()
	for (const link of links) {
		if (link.idUserLeader === null) continue
		const existing = children.get(link.idUserLeader)
		if (existing) existing.push(link.idUser)
		else children.set(link.idUserLeader, [link.idUser])
	}

	const closure: number[] = []
	const seen = new Set<number>()
	const stack: { id: number; depth: number }[] = []
	for (const root of roots) {
		if (!Number.isInteger(root) || root <= 0 || seen.has(root)) continue
		stack.push({ id: root, depth: 0 })
	}

	while (stack.length > 0) {
		const current = stack.pop()
		if (!current || seen.has(current.id)) continue
		seen.add(current.id)
		closure.push(current.id)
		if (current.depth >= MAX_DEPTH) continue
		for (const childId of children.get(current.id) ?? []) {
			if (!seen.has(childId)) stack.push({ id: childId, depth: current.depth + 1 })
		}
	}

	closure.sort((left, right) => left - right)
	return closure
}

/** Bypass viewers (`visibleUserIds` empty) may exclude anyone. Everyone else only excludes inside their scope. */
export function exclusionsWithinScope(visibleUserIds: readonly number[], closure: readonly number[]): number[] {
	if (visibleUserIds.length === 0) return [...closure]
	const allowed = new Set(visibleUserIds)
	return closure.filter((id) => allowed.has(id))
}
