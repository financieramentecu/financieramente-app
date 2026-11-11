import { describe, expect, it } from 'vitest'
import {
	compareTimelineKeys,
	decodeTimelineCursor,
	encodeTimelineCursor,
	mergeTimelineEntries,
	type TimelineKey,
} from '@/features/leads/activities/merge-timeline'

const at = (iso: string) => new Date(iso)
const key = (iso: string, kind: TimelineKey['kind'], id: number): TimelineKey => ({ occurredAt: at(iso), kind, id })

describe('compareTimelineKeys', () => {
	it('orders newest first', () => {
		expect(compareTimelineKeys(key('2026-11-09T11:00:00Z', 'activity', 1), key('2026-11-09T10:00:00Z', 'activity', 2))).toBeLessThan(0)
	})
	it('puts stage changes before activities on equal time', () => {
		expect(compareTimelineKeys(key('2026-11-09T10:00:00Z', 'stage_change', 9), key('2026-11-09T10:00:00Z', 'activity', 1))).toBeLessThan(0)
	})
	it('breaks remaining ties by larger id first', () => {
		expect(compareTimelineKeys(key('2026-11-09T10:00:00Z', 'activity', 5), key('2026-11-09T10:00:00Z', 'activity', 3))).toBeLessThan(0)
	})
})

describe('mergeTimelineEntries', () => {
	const a = [key('2026-11-09T11:00:00Z', 'activity', 2), key('2026-11-09T09:00:00Z', 'activity', 1)]
	const s = [key('2026-11-09T10:00:00Z', 'stage_change', 7)]

	it('merges two sorted lists and truncates to the limit', () => {
		const { items, hasMore } = mergeTimelineEntries(a, s, 2)
		expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(['activity:2', 'stage_change:7'])
		expect(hasMore).toBe(true)
	})

	it('reports no more items when everything fits', () => {
		expect(mergeTimelineEntries(a, s, 5).hasMore).toBe(false)
	})

	it('reports more when a source says it has more', () => {
		expect(mergeTimelineEntries(a, s, 5, { sourceHasMore: true }).hasMore).toBe(true)
	})
})

describe('timeline cursor', () => {
	it('round-trips', () => {
		const k = key('2026-11-09T10:00:00.000Z', 'stage_change', 7)
		expect(decodeTimelineCursor(encodeTimelineCursor(k))).toEqual(k)
	})
	it('accepts the legacy iso|id activity cursor', () => {
		expect(decodeTimelineCursor('2026-11-09T10:00:00.000Z|4')).toEqual(key('2026-11-09T10:00:00.000Z', 'activity', 4))
	})
	it.each(['', 'garbage', 'x|activity|1', '2026-11-09T10:00:00Z|other|1', '2026-11-09T10:00:00Z|activity|0'])(
		'rejects %j',
		(value) => {
			expect(decodeTimelineCursor(value)).toBeNull()
		}
	)
})
