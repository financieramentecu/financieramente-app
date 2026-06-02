import { describe, it, expect } from 'vitest'
import { isDraftEqualToApplied } from '../../lib/is-draft-equal-to-applied'
import type { DashboardFilterDraft } from '../../types/dashboard-filter.types'

function base(): DashboardFilterDraft {
  return {
    dateRange: { start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) },
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

describe('isDraftEqualToApplied', () => {
  it('returns true when draft equals applied (same reference values)', () => {
    expect(isDraftEqualToApplied(base(), base())).toBe(true)
  })

  it('returns false when categoryIds differs', () => {
    const draft = { ...base(), categoryIds: [5] }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns false when companyIds differs', () => {
    const draft = { ...base(), companyIds: [1, 2] }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns false when isInternacional differs', () => {
    const draft = { ...base(), isInternacional: true }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns false when dateRange start differs', () => {
    const draft = { ...base(), dateRange: { start: new Date(2025, 2, 1), end: new Date(2025, 11, 31) } }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns false when dateRange end differs', () => {
    const draft = { ...base(), dateRange: { start: new Date(2025, 0, 1), end: new Date(2025, 5, 30) } }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns false when statuses array length differs even if draft has one item', () => {
    const draft = { ...base(), statuses: ['EMITIDO'] }
    expect(isDraftEqualToApplied(draft, base())).toBe(false)
  })

  it('returns true when identical arrays with same items in same order', () => {
    const draft = { ...base(), companyIds: [1, 2] }
    const applied = { ...base(), companyIds: [1, 2] }
    expect(isDraftEqualToApplied(draft, applied)).toBe(true)
  })

  it('returns false when arrays have same items in different order', () => {
    const draft = { ...base(), companyIds: [2, 1] }
    const applied = { ...base(), companyIds: [1, 2] }
    // Order matters — reducer always appends; same filter state has same order
    expect(isDraftEqualToApplied(draft, applied)).toBe(false)
  })
})
