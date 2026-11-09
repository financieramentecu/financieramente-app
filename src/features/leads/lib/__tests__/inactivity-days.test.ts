import { describe, expect, it } from 'vitest'
import { getInactivityDays, resolveInactivityThreshold } from '@/features/leads/lib/inactivity-days'

const now = new Date('2026-11-19T15:00:00Z')

describe('getInactivityDays', () => {
	it('returns the idle days of a stale open lead', () => {
		expect(
			getInactivityDays({ outcomeStatus: 'OPEN', lastActivityAt: new Date('2026-11-09T15:00:00Z'), createdAt: new Date('2026-10-01T00:00:00Z') }, now, 7)
		).toBe(10)
	})
	it('falls back to createdAt when the lead never had activity', () => {
		expect(getInactivityDays({ outcomeStatus: 'OPEN', lastActivityAt: null, createdAt: new Date('2026-11-01T15:00:00Z') }, now, 7)).toBe(18)
	})
	it('returns null below the threshold', () => {
		expect(getInactivityDays({ outcomeStatus: 'OPEN', lastActivityAt: new Date('2026-11-15T15:00:00Z'), createdAt: new Date('2026-10-01T00:00:00Z') }, now, 7)).toBeNull()
	})
	it.each(['WON', 'LOST', 'ABANDONED'] as const)('returns null for %s leads', (outcomeStatus) => {
		expect(getInactivityDays({ outcomeStatus, lastActivityAt: null, createdAt: new Date('2026-01-01T00:00:00Z') }, now, 7)).toBeNull()
	})
})

describe('resolveInactivityThreshold', () => {
	it.each([
		[undefined, 7],
		['', 7],
		['abc', 7],
		['0', 7],
		['14', 14],
	])('%j → %d', (value, expected) => {
		expect(resolveInactivityThreshold(value)).toBe(expected)
	})
})
