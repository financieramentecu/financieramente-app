export type TimelineKind = 'activity' | 'stage_change'

export interface TimelineKey {
	occurredAt: Date
	kind: TimelineKind
	id: number
}

const KIND_RANK: Record<TimelineKind, number> = { activity: 0, stage_change: 1 }

/** Timeline order: newest first, then stage changes before activities, then larger id. */
export function compareTimelineKeys(a: TimelineKey, b: TimelineKey): number {
	const byTime = b.occurredAt.getTime() - a.occurredAt.getTime()
	if (byTime !== 0) return byTime
	const byKind = KIND_RANK[b.kind] - KIND_RANK[a.kind]
	if (byKind !== 0) return byKind
	return b.id - a.id
}

export function mergeTimelineEntries<T extends TimelineKey>(
	first: readonly T[],
	second: readonly T[],
	limit: number,
	options: { sourceHasMore?: boolean } = {}
): { items: T[]; hasMore: boolean } {
	const merged = [...first, ...second].sort(compareTimelineKeys)
	return {
		items: merged.slice(0, limit),
		hasMore: merged.length > limit || Boolean(options.sourceHasMore),
	}
}

export function encodeTimelineCursor(key: TimelineKey): string {
	return `${key.occurredAt.toISOString()}|${key.kind}|${key.id}`
}

/** Accepts `iso|kind|id` and the legacy activity-only `iso|id`. */
export function decodeTimelineCursor(value: string): TimelineKey | null {
	const parts = value.split('|')
	const [iso, kindOrId, maybeId] = parts
	const kind = parts.length === 2 ? 'activity' : kindOrId
	const idValue = parts.length === 2 ? kindOrId : maybeId
	if (parts.length !== 2 && parts.length !== 3) return null
	if (kind !== 'activity' && kind !== 'stage_change') return null
	const occurredAt = new Date(iso ?? '')
	const id = Number.parseInt(idValue ?? '', 10)
	if (Number.isNaN(occurredAt.getTime()) || !Number.isSafeInteger(id) || id < 1) return null
	return { occurredAt, kind, id }
}
