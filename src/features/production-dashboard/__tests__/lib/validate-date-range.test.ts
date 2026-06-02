import { describe, it, expect } from 'vitest'
import { isDateRangeValid } from '../../lib/validate-date-range'

describe('isDateRangeValid', () => {
  it('returns true when start equals end (same day)', () => {
    const d = new Date(2025, 5, 15)
    expect(isDateRangeValid(d, d)).toBe(true)
  })

  it('returns true when start is before end within the same year', () => {
    expect(isDateRangeValid(new Date(2025, 0, 1), new Date(2025, 11, 31))).toBe(true)
  })

  it('returns true when start year is before end year', () => {
    expect(isDateRangeValid(new Date(2024, 11, 1), new Date(2025, 0, 1))).toBe(true)
  })

  it('returns false when start date is after end date in same year', () => {
    expect(isDateRangeValid(new Date(2025, 5, 1), new Date(2025, 2, 1))).toBe(false)
  })

  it('returns false when start year is after end year', () => {
    expect(isDateRangeValid(new Date(2026, 0, 1), new Date(2025, 11, 31))).toBe(false)
  })

  it('returns false when start is one day after end', () => {
    expect(isDateRangeValid(new Date(2025, 0, 16), new Date(2025, 0, 15))).toBe(false)
  })
})
