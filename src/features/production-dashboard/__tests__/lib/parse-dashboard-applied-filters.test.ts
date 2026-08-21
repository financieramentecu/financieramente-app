import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseHasSupports,
  parseDashboardAppliedFilters,
  parseIds,
} from '../../lib/parse-dashboard-applied-filters'

describe('parseHasSupports', () => {
  it('returns true for "true"', () => {
    expect(parseHasSupports('true')).toBe(true)
  })

  it('returns false for "false"', () => {
    expect(parseHasSupports('false')).toBe(false)
  })

  it('returns undefined for null, empty, or invalid values', () => {
    expect(parseHasSupports(null)).toBeUndefined()
    expect(parseHasSupports('')).toBeUndefined()
    expect(parseHasSupports('True')).toBeUndefined()
    expect(parseHasSupports('1')).toBeUndefined()
  })
})

describe('parseDashboardAppliedFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses hasSupports=true into applied filters', () => {
    const params = new URLSearchParams('hasSupports=true&statuses=EMITIDO')
    const filters = parseDashboardAppliedFilters(params)
    expect(filters.hasSupports).toBe(true)
    expect(filters.statuses).toEqual(['EMITIDO'])
  })

  it('parses hasSupports=false into applied filters', () => {
    const params = new URLSearchParams('hasSupports=false')
    const filters = parseDashboardAppliedFilters(params)
    expect(filters.hasSupports).toBe(false)
  })

  it('omits hasSupports when param is absent (Todos)', () => {
    const params = new URLSearchParams('categoryIds=1,2')
    const filters = parseDashboardAppliedFilters(params)
    expect(filters.hasSupports).toBeUndefined()
    expect('hasSupports' in filters).toBe(false)
    expect(filters.categoryIds).toEqual([1, 2])
  })

  it('round-trips encode/decode for hasSupports with date and ids', () => {
    const encoded = new URLSearchParams()
    encoded.set('dateFrom', '2026-01-01')
    encoded.set('dateTo', '2026-01-31')
    encoded.set('statuses', 'EMITIDO,FONDEADO')
    encoded.set('hasSupports', 'true')

    const filters = parseDashboardAppliedFilters(encoded)
    expect(filters.hasSupports).toBe(true)
    expect(filters.statuses).toEqual(['EMITIDO', 'FONDEADO'])
    expect(filters.dateRange.start.toISOString().slice(0, 10)).toBe('2026-01-01')
    expect(filters.dateRange.end.toISOString().slice(0, 10)).toBe('2026-01-31')
  })
})

describe('parseIds', () => {
  it('returns null for null input', () => {
    expect(parseIds(null)).toBeNull()
  })

  it('returns [] for empty string', () => {
    expect(parseIds('')).toEqual([])
  })

  it('parses comma-separated integers', () => {
    expect(parseIds('1,2,3')).toEqual([1, 2, 3])
  })

  it('returns null for non-integer values', () => {
    expect(parseIds('1,abc')).toBeNull()
  })
})
