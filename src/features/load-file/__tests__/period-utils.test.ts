import { describe, it, expect } from 'vitest'
import { getDefaultPeriod } from '../lib/period-utils'

describe('getDefaultPeriod', () => {
	describe('returns the current month and year', () => {
		it('January → returns { month: 1, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 0, 15)) // January (month index 0)
			expect(result).toEqual({ month: 1, year: 2026 })
		})

		it('February → returns { month: 2, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 1, 10)) // February (month index 1)
			expect(result).toEqual({ month: 2, year: 2026 })
		})

		it('June → returns { month: 6, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2025, 5, 20)) // June (month index 5)
			expect(result).toEqual({ month: 6, year: 2025 })
		})

		it('December → returns { month: 12, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 11, 1)) // December (month index 11)
			expect(result).toEqual({ month: 12, year: 2026 })
		})

		it('any month returns month = currentMonth (1-based)', () => {
			for (let m = 1; m <= 12; m++) {
				// Use local date constructor (m-1 because Date month is 0-indexed)
				const date = new Date(2026, m - 1, 15)
				const result = getDefaultPeriod(date)
				expect(result.month).toBe(m)
				expect(result.year).toBe(2026)
			}
		})
	})

	describe('defaults to current Date when no argument is provided', () => {
		it('returns an object with month and year when called with no args', () => {
			const result = getDefaultPeriod()
			expect(result).toHaveProperty('month')
			expect(result).toHaveProperty('year')
			expect(typeof result.month).toBe('number')
			expect(typeof result.year).toBe('number')
			expect(result.month).toBeGreaterThanOrEqual(1)
			expect(result.month).toBeLessThanOrEqual(12)
		})
	})
})
