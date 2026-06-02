import { describe, it, expect } from 'vitest'
import { formatPeriodLabel } from '../../lib/format-period-label'

describe('formatPeriodLabel', () => {
  it('formats a full-year range', () => {
    const result = formatPeriodLabel(new Date(2025, 0, 1), new Date(2025, 11, 31))
    expect(result).toContain('2025')
    expect(result).toContain('-')
  })

  it('formats a single-day range (same day)', () => {
    const result = formatPeriodLabel(new Date(2025, 5, 15), new Date(2025, 5, 15))
    expect(result).toMatch(/15.*Jun.*2025.*-.*15.*Jun.*2025/i)
  })

  it('formats a cross-year range containing both years', () => {
    const result = formatPeriodLabel(new Date(2024, 11, 1), new Date(2025, 2, 31))
    expect(result).toContain('2024')
    expect(result).toContain('2025')
  })

  it('formats a range within the same month', () => {
    const result = formatPeriodLabel(new Date(2025, 0, 1), new Date(2025, 0, 15))
    expect(result).toContain('Ene')
    expect(result).toContain('2025')
  })

  it('capitalizes the month abbreviation', () => {
    const result = formatPeriodLabel(new Date(2025, 5, 1), new Date(2025, 5, 30))
    // "jun" should be capitalized to "Jun"
    expect(result).toMatch(/Jun/)
  })
})
