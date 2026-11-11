import { describe, expect, it } from 'vitest'
import { activityBucket, dueAtForActivityBucket } from '@/features/leads/agenda/activity-bucket'

const now = new Date('2026-11-09T15:00:00.000Z')

describe('activity buckets', () => {
	it('places each open-column anchor inside that column', () => {
		for (const bucket of ['overdue', 'today', 'upcoming'] as const) {
			expect(activityBucket({ status: 'OPEN', dueAt: dueAtForActivityBucket(bucket, now), completedAt: null }, now)).toBe(bucket)
		}
	})

	it('keeps an undated open task in próximas and a recent completion in completadas', () => {
		expect(activityBucket({ status: 'OPEN', dueAt: null, completedAt: null }, now)).toBe('upcoming')
		expect(activityBucket({ status: 'DONE', dueAt: null, completedAt: '2026-11-08T15:00:00.000Z' }, now)).toBe('done')
		expect(activityBucket({ status: 'DONE', dueAt: null, completedAt: '2026-10-01T15:00:00.000Z' }, now)).toBeNull()
	})
})
