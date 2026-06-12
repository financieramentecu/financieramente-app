import { describe, it, expect } from 'vitest'
import { todayBogota, bogotaYearMonth, isSameMonthOrFuture, isStrictlyFutureMonth } from '../bogota-date'

describe('todayBogota', () => {
	it('returns a Date object', () => {
		const result = todayBogota()
		expect(result).toBeInstanceOf(Date)
	})

	it('accepts injectable now for determinism — UTC 03:00 = Bogota previous day', () => {
		// UTC 2026-06-12T03:00:00Z = Bogota 2026-06-11 22:00:00 (UTC-5)
		const nowUtc = new Date('2026-06-12T03:00:00Z')
		const bogota = todayBogota(nowUtc)
		// todayBogota returns UTC midnight of Bogota calendar day (June 11)
		// so the ISO string should start with 2026-06-11
		expect(bogota.toISOString().slice(0, 10)).toBe('2026-06-11')
	})

	it('UTC 06:00 = Bogota 01:00 next day — Bogota date is June 12', () => {
		// UTC 2026-06-12T06:00:00Z = Bogota 2026-06-12 01:00:00 (UTC-5)
		const nowUtc = new Date('2026-06-12T06:00:00Z')
		const bogota = todayBogota(nowUtc)
		// todayBogota returns UTC midnight of Bogota calendar day (June 12)
		expect(bogota.toISOString().slice(0, 10)).toBe('2026-06-12')
	})
})

describe('bogotaYearMonth', () => {
	it('returns YYYY-MM format', () => {
		const d = new Date('2026-07-15T12:00:00Z')
		const ym = bogotaYearMonth(d)
		expect(ym).toMatch(/^\d{4}-\d{2}$/)
	})

	it('returns Bogota calendar month, not UTC', () => {
		// UTC 2026-07-01T01:00:00Z = Bogota 2026-06-30 20:00:00 (UTC-5)
		const nowUtc = new Date('2026-07-01T01:00:00Z')
		// When we get todayBogota at this moment, year-month in Bogota should be 2026-06
		const bogota = todayBogota(nowUtc)
		expect(bogotaYearMonth(bogota)).toBe('2026-06')
	})
})

describe('isSameMonthOrFuture', () => {
	it('returns false for null ref', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isSameMonthOrFuture(null, now)).toBe(false)
	})

	it('returns true when ref is same month as now (Bogota)', () => {
		// now = June 15 2026 in Bogota
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isSameMonthOrFuture('2026-06-01', now)).toBe(true)
	})

	it('returns true when ref is future month', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isSameMonthOrFuture('2026-07-01', now)).toBe(true)
	})

	it('returns false when ref is past month', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isSameMonthOrFuture('2026-05-31', now)).toBe(false)
	})

	it('uses Bogota TZ at UTC midnight edge — UTC 2026-07-01T01:00Z = Bogota June 30', () => {
		// Bogota is UTC-5; UTC 01:00 July 1 = 20:00 June 30 in Bogota
		const nowUtc = new Date('2026-07-01T01:00:00Z')
		// For a payment expected in June 2026, Bogota month is still June → same month → true
		expect(isSameMonthOrFuture('2026-06-15', nowUtc)).toBe(true)
		// For a payment in July, that would be future from June → also true
		expect(isSameMonthOrFuture('2026-07-15', nowUtc)).toBe(true)
		// For a payment in May, that is past from June → false
		expect(isSameMonthOrFuture('2026-05-15', nowUtc)).toBe(false)
	})
})

describe('isStrictlyFutureMonth', () => {
	it('returns false for null ref', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isStrictlyFutureMonth(null, now)).toBe(false)
	})

	it('returns false when ref is same month as now', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isStrictlyFutureMonth('2026-06-01', now)).toBe(false)
	})

	it('returns true when ref is a future month', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isStrictlyFutureMonth('2026-07-01', now)).toBe(true)
	})

	it('returns false when ref is past month', () => {
		const now = new Date('2026-06-15T12:00:00Z')
		expect(isStrictlyFutureMonth('2026-05-31', now)).toBe(false)
	})

	it('uses Bogota TZ at UTC midnight edge — UTC 2026-07-01T01:00Z = Bogota June 30', () => {
		const nowUtc = new Date('2026-07-01T01:00:00Z')
		// Bogota is June 30, ref June 15 → same month → false
		expect(isStrictlyFutureMonth('2026-06-15', nowUtc)).toBe(false)
		// ref July → future month from Bogota's perspective → true
		expect(isStrictlyFutureMonth('2026-07-15', nowUtc)).toBe(true)
	})
})
