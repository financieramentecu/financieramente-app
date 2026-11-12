import { describe, expect, it } from 'vitest'
import { activityBucket, activityStateName, columnTitle, dueAtForActivityBucket, placedColumn } from '@/features/leads/agenda/activity-bucket'

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

	it('keeps a pinned card in its custom column and hides a card whose due-date column is gone', () => {
		const columns = [
			{ code: 'today', name: 'Vencen hoy' },
			{ code: 'xabc', name: 'Seguimiento' },
		]
		const overdue = dueAtForActivityBucket('overdue', now).toISOString()
		expect(placedColumn({ status: 'OPEN', dueAt: overdue, completedAt: null, columnCode: 'xabc' }, columns, now)).toBe('xabc')
		expect(placedColumn({ status: 'OPEN', dueAt: overdue, completedAt: null, columnCode: null }, columns, now)).toBeNull()
		expect(placedColumn({ status: 'OPEN', dueAt: dueAtForActivityBucket('today', now).toISOString(), completedAt: null }, columns, now)).toBe('today')
	})

	it('names a pinned card after its column and a dated card after the due-date column', () => {
		const columns = [
			{ code: 'today', name: 'Vencen hoy' },
			{ code: 'xabc', name: 'Seguimiento' },
		]
		const overdue = dueAtForActivityBucket('overdue', now).toISOString()
		expect(activityStateName({ status: 'OPEN', dueAt: overdue, completedAt: null, columnCode: 'xabc' }, columns, now)).toBe('Seguimiento')
		expect(activityStateName({ status: 'OPEN', dueAt: dueAtForActivityBucket('today', now).toISOString(), completedAt: null }, columns, now)).toBe('Vencen hoy')
		expect(activityStateName({ status: 'CANCELLED', dueAt: null, completedAt: null }, columns, now)).toBeNull()
	})

	it('uses a renamed column title and falls back when that column was not renamed', () => {
		const columns = [{ code: 'overdue', name: 'Atrasadas' }]
		expect(columnTitle(columns, 'overdue')).toBe('Atrasadas')
		expect(columnTitle(columns, 'today')).toBe('Vencen hoy')
		expect(columnTitle([{ code: 'done', name: '' }], 'done')).toBe('Completadas')
	})
})
