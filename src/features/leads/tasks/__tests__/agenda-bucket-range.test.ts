import { describe, expect, it } from 'vitest'
import { getAgendaBucketWhere, getBogotaDayBounds } from '@/features/leads/tasks/agenda-bucket-range'

describe('getBogotaDayBounds', () => {
	it('uses Bogotá midnight (05:00 UTC)', () => {
		const { start, end } = getBogotaDayBounds(new Date('2026-11-09T15:00:00Z'))
		expect(start.toISOString()).toBe('2026-11-09T05:00:00.000Z')
		expect(end.toISOString()).toBe('2026-11-10T05:00:00.000Z')
	})
	it('23:30 Bogotá (04:30 UTC next day) still belongs to the Bogotá day', () => {
		const { start } = getBogotaDayBounds(new Date('2026-11-10T04:30:00Z'))
		expect(start.toISOString()).toBe('2026-11-09T05:00:00.000Z')
	})
})

describe('getAgendaBucketWhere', () => {
	const now = new Date('2026-11-09T15:00:00Z')
	const start = new Date('2026-11-09T05:00:00Z')
	const end = new Date('2026-11-10T05:00:00Z')

	it('overdue: open and due before today', () => {
		expect(getAgendaBucketWhere('overdue', now)).toEqual({ status: 'OPEN', dueAt: { lt: start } })
	})
	it('today: open and due within today', () => {
		expect(getAgendaBucketWhere('today', now)).toEqual({ status: 'OPEN', dueAt: { gte: start, lt: end } })
	})
	it('upcoming: open, next 14 days or without date', () => {
		expect(getAgendaBucketWhere('upcoming', now)).toEqual({
			status: 'OPEN',
			OR: [{ dueAt: { gte: end, lt: new Date('2026-11-24T05:00:00Z') } }, { dueAt: null }],
		})
	})
	it('done: completed in the last 7 days', () => {
		expect(getAgendaBucketWhere('done', now)).toEqual({
			status: 'DONE',
			completedAt: { gte: new Date('2026-11-02T15:00:00Z') },
		})
	})
})
