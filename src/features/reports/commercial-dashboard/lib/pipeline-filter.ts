/**
 * Pipeline (CRM `originTag`) filter helpers shared by the API and the UI.
 * An empty / absent selection means "all pipelines".
 */

import type { Prisma } from '@prisma/client'

/** Sentinel for leads that carry no pipeline name. */
export const NO_PIPELINE = '__none__'

export function buildPipelineWhere(
	pipelines: readonly string[]
): Prisma.LeadWhereInput | null {
	if (pipelines.length === 0) return null
	const names = pipelines.filter((name) => name !== NO_PIPELINE)
	const includesNone = names.length !== pipelines.length
	if (!includesNone) return { originTag: { in: names } }
	return names.length === 0
		? { originTag: null }
		: { OR: [{ originTag: { in: names } }, { originTag: null }] }
}

/**
 * Handles a chip click. `selected === null` means all are active: the first
 * click isolates that pipeline; later clicks add or remove pipelines.
 * Never leaves the selection empty; returns null again once everything is on.
 */
export function togglePipeline(
	selected: readonly string[] | null,
	name: string,
	allNames: readonly string[]
): readonly string[] | null {
	if (selected === null) return [name]
	const current = new Set(selected)
	if (current.has(name)) {
		if (current.size === 1) return selected
		current.delete(name)
	} else {
		current.add(name)
	}
	return current.size === allNames.length ? null : [...current]
}
