import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getActiveBadges } from '../../lib/derive-active-badges'
import type { DashboardAppliedFilters } from '../../types/dashboard-filter.types'

function defaultApplied(): DashboardAppliedFilters {
  const year = 2025
  return {
    dateRange: { start: new Date(2025, 5, 1), end: new Date(2025, 5, 30) },
    statuses: [],
    categoryIds: [],
    companyIds: [],
    productIds: [],
    originIds: [],
    plazos: [],
    periodicidades: [],
    isInternacional: false,
  }
}

describe('getActiveBadges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty array when all filters are at defaults', () => {
    const result = getActiveBadges(defaultApplied())
    expect(result).toEqual([])
  })

  it('emits a period badge when date range differs from default', () => {
    const applied = defaultApplied()
    applied.dateRange = { start: new Date(2025, 2, 1), end: new Date(2025, 8, 30) }
    const badges = getActiveBadges(applied)
    const periodBadge = badges.find((b) => b.field === 'dateRange')
    expect(periodBadge).toBeDefined()
    expect(periodBadge?.label).toContain('Mar')
    expect(periodBadge?.label).toContain('Sep')
  })

  it('emits a company badge when companyIds is non-empty', () => {
    const applied = defaultApplied()
    applied.companyIds = [1, 2]
    const badges = getActiveBadges(applied)
    expect(badges.some((b) => b.field === 'companyIds')).toBe(true)
  })

  it('emits a category badge when categoryIds is non-empty', () => {
    const applied = defaultApplied()
    applied.categoryIds = [5]
    const badges = getActiveBadges(applied)
    expect(badges.some((b) => b.field === 'categoryIds')).toBe(true)
  })

  it('emits one badge per non-default filter field', () => {
    const applied = defaultApplied()
    applied.companyIds = [1]
    applied.statuses = ['EMITIDO']
    const badges = getActiveBadges(applied)
    expect(badges.length).toBe(2)
  })

  it('each badge has a unique key', () => {
    const applied = defaultApplied()
    applied.companyIds = [1]
    applied.categoryIds = [2]
    applied.statuses = ['EMITIDO']
    const badges = getActiveBadges(applied)
    const keys = badges.map((b) => b.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
