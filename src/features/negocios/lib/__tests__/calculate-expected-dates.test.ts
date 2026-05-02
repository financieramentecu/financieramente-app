import { describe, it, expect } from 'vitest'
import { calculateExpectedDates } from '../calculate-expected-dates'

// Helper: create dates using local constructor to avoid UTC-midnight timezone shifts
const d = (year: number, month: number, day: number) => new Date(year, month - 1, day)

// Helper: compare date by local year/month/day to be timezone-agnostic
const ymd = (date: Date) => ({
	year: date.getFullYear(),
	month: date.getMonth() + 1,
	day: date.getDate(),
})

describe('calculateExpectedDates', () => {
	describe('edge cases — empty output', () => {
		it('numAportes=0 → []', () => {
			const result = calculateExpectedDates(d(2025, 1, 31), 0, 'Mensual')
			expect(result).toEqual([])
		})

		it('numAportes=1 → [anchorDate]', () => {
			const anchor = d(2025, 5, 18)
			const result = calculateExpectedDates(anchor, 1, 'Mensual')
			expect(result).toHaveLength(1)
			expect(ymd(result[0])).toEqual({ year: 2025, month: 5, day: 18 })
		})
	})

	describe('end-of-month clamping', () => {
		it('Mensual anchor=2025-01-31, numAportes=3 → [2025-01-31, 2025-02-28, 2025-03-31]', () => {
			const result = calculateExpectedDates(d(2025, 1, 31), 3, 'Mensual')
			expect(result).toHaveLength(3)
			expect(ymd(result[0])).toEqual({ year: 2025, month: 1, day: 31 })
			expect(ymd(result[1])).toEqual({ year: 2025, month: 2, day: 28 })
			expect(ymd(result[2])).toEqual({ year: 2025, month: 3, day: 31 })
		})

		it('Mensual anchor=2024-01-31, numAportes=2 → [2024-01-31, 2024-02-29] (leap year)', () => {
			const result = calculateExpectedDates(d(2024, 1, 31), 2, 'Mensual')
			expect(result).toHaveLength(2)
			expect(ymd(result[0])).toEqual({ year: 2024, month: 1, day: 31 })
			expect(ymd(result[1])).toEqual({ year: 2024, month: 2, day: 29 })
		})
	})

	describe('standard periodicities', () => {
		it('Semestral anchor=2025-05-18, numAportes=3 → [2025-05-18, 2025-11-18, 2026-05-18]', () => {
			const result = calculateExpectedDates(d(2025, 5, 18), 3, 'Semestral')
			expect(result).toHaveLength(3)
			expect(ymd(result[0])).toEqual({ year: 2025, month: 5, day: 18 })
			expect(ymd(result[1])).toEqual({ year: 2025, month: 11, day: 18 })
			expect(ymd(result[2])).toEqual({ year: 2026, month: 5, day: 18 })
		})

		it('Anual anchor=2025-03-15, numAportes=3 → [2025-03-15, 2026-03-15, 2027-03-15]', () => {
			const result = calculateExpectedDates(d(2025, 3, 15), 3, 'Anual')
			expect(result).toHaveLength(3)
			expect(ymd(result[0])).toEqual({ year: 2025, month: 3, day: 15 })
			expect(ymd(result[1])).toEqual({ year: 2026, month: 3, day: 15 })
			expect(ymd(result[2])).toEqual({ year: 2027, month: 3, day: 15 })
		})
	})
})
