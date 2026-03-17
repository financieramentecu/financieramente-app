import { describe, it, expect } from 'vitest'
import { getDefaultPeriod } from '../lib/period-utils'

describe('getDefaultPeriod', () => {
	describe('January wrap-around: returns month=12, year=currentYear-1', () => {
		it('when current month is January (month 1), returns { month: 12, year: currentYear - 1 }', () => {
			const januaryDate = new Date(2026, 0, 15) // January (month index 0)
			const result = getDefaultPeriod(januaryDate)
			expect(result.month).toBe(12)
			expect(result.year).toBe(2025)
		})

		it('when current month is January of year 2024, returns { month: 12, year: 2023 }', () => {
			// Use local date constructor to avoid UTC timezone offset issues
			const result = getDefaultPeriod(new Date(2024, 0, 15)) // month is 0-indexed
			expect(result).toEqual({ month: 12, year: 2023 })
		})
	})

	describe('February through December: returns previous month and current year', () => {
		it('February → returns { month: 1, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 1, 10)) // February (month index 1)
			expect(result).toEqual({ month: 1, year: 2026 })
		})

		it('March → returns { month: 2, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 2, 14)) // March (month index 2)
			expect(result).toEqual({ month: 2, year: 2026 })
		})

		it('June → returns { month: 5, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2025, 5, 20)) // June (month index 5)
			expect(result).toEqual({ month: 5, year: 2025 })
		})

		it('December → returns { month: 11, year: currentYear }', () => {
			const result = getDefaultPeriod(new Date(2026, 11, 1)) // December (month index 11)
			expect(result).toEqual({ month: 11, year: 2026 })
		})

		it('any date in February through December returns month = currentMonth - 1', () => {
			for (let m = 2; m <= 12; m++) {
				// Use local date constructor (m-1 because Date month is 0-indexed)
				const date = new Date(2026, m - 1, 15)
				const result = getDefaultPeriod(date)
				expect(result.month).toBe(m - 1)
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
