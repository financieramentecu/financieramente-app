import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildDefaultFilters } from '../../lib/build-default-filters'

describe('buildDefaultFilters', () => {
  beforeEach(() => {
    // Fix current year to 2025 for deterministic tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns dateRange with start on first day and end on last day of current month', () => {
    const result = buildDefaultFilters()
    // Fake time is 2025-06-15, so current month is June 2025
    expect(result.dateRange.start).toEqual(new Date(2025, 5, 1))   // Jun 1
    expect(result.dateRange.end.getFullYear()).toBe(2025)
    expect(result.dateRange.end.getMonth()).toBe(5)                 // June
    expect(result.dateRange.end.getDate()).toBe(30)                 // Jun 30
  })

  it('returns all array fields as empty arrays', () => {
    const result = buildDefaultFilters()
    expect(result.statuses).toEqual([])
    expect(result.categoryIds).toEqual([])
    expect(result.companyIds).toEqual([])
    expect(result.productIds).toEqual([])
    expect(result.originIds).toEqual([])
    expect(result.plazos).toEqual([])
    expect(result.periodicidades).toEqual([])
  })

  it('returns isInternacional as false', () => {
    const result = buildDefaultFilters()
    expect(result.isInternacional).toBe(false)
  })

  it('omits hasSupports (Todos = undefined)', () => {
    const result = buildDefaultFilters()
    expect(result.hasSupports).toBeUndefined()
  })

  it('returns a fresh object each call (no shared reference)', () => {
    const a = buildDefaultFilters()
    const b = buildDefaultFilters()
    expect(a).not.toBe(b)
    a.categoryIds.push(99)
    expect(b.categoryIds).toEqual([])
  })
})
