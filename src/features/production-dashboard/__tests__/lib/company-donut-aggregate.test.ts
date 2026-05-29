import { describe, it, expect } from 'vitest'
import { aggregateCompanyDonut } from '../../lib/company-donut-aggregate'
import { COMPANY_BASE_PALETTE, COMPANY_LIGHT_PALETTE, COP_CURRENCY_ID } from '../../lib/company-donut-colors'
import type { CompanyDonutRaw } from '../../types/production-kpi.types'

function makeRaw(overrides: Partial<CompanyDonutRaw> = {}): CompanyDonutRaw {
  return {
    companyId: 1,
    companyName: 'SKANDIA',
    currencyId: 2,
    currencyName: 'Dólar',
    currencySymbol: 'USD',
    count: 10,
    totalValue: 100000,
    ...overrides,
  }
}

describe('aggregateCompanyDonut', () => {
  it('returns [] for empty input', () => {
    expect(aggregateCompanyDonut([])).toEqual([])
  })

  it('returns [] when total count is zero', () => {
    const raw = [makeRaw({ count: 0 }), makeRaw({ companyId: 2, count: 0 })]
    expect(aggregateCompanyDonut(raw)).toEqual([])
  })

  it('gives 100% to a single item', () => {
    const result = aggregateCompanyDonut([makeRaw({ count: 42 })])
    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(100.0)
  })

  it('computes percentages that sum to 100 ± 0.1 for multiple items', () => {
    const raw: CompanyDonutRaw[] = [
      makeRaw({ companyId: 1, count: 50 }),
      makeRaw({ companyId: 2, count: 30 }),
      makeRaw({ companyId: 3, count: 20 }),
    ]
    const result = aggregateCompanyDonut(raw)
    const sum = result.reduce((acc, s) => acc + s.percentage, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('handles two equal segments at 50% each', () => {
    const raw: CompanyDonutRaw[] = [
      makeRaw({ companyId: 1, count: 50 }),
      makeRaw({ companyId: 2, count: 50 }),
    ]
    const result = aggregateCompanyDonut(raw)
    expect(result[0].percentage).toBe(50.0)
    expect(result[1].percentage).toBe(50.0)
  })

  it('rounds percentage to 1 decimal place', () => {
    // 1/3 ≈ 33.333... → should round to 33.3
    const raw: CompanyDonutRaw[] = [
      makeRaw({ companyId: 1, count: 1 }),
      makeRaw({ companyId: 2, count: 1 }),
      makeRaw({ companyId: 3, count: 1 }),
    ]
    const result = aggregateCompanyDonut(raw)
    result.forEach((s) => {
      expect(s.percentage).toBeCloseTo(33.3, 0)
    })
  })

  it('assigns base palette fill regardless of currency (currencies are merged)', () => {
    const raw = [makeRaw({ companyId: 10, currencyId: 2, count: 5 })]
    const result = aggregateCompanyDonut(raw)
    // companyId 10 → sorted → index 0 → base palette[0]
    expect(result[0].fill).toBe(COMPANY_BASE_PALETTE[0])
  })

  it('assigns base palette fill even for COP-only company (currencies merged into one slice)', () => {
    const raw = [makeRaw({ companyId: 10, currencyId: COP_CURRENCY_ID, count: 5 })]
    const result = aggregateCompanyDonut(raw)
    expect(result[0].fill).toBe(COMPANY_BASE_PALETTE[0])
  })

  it('fills match expected palette indices by sorted companyId', () => {
    // Two companies: 10 → index 0, 20 → index 1
    const raw: CompanyDonutRaw[] = [
      makeRaw({ companyId: 20, currencyId: 2, count: 30 }),
      makeRaw({ companyId: 10, currencyId: 2, count: 70 }),
    ]
    const result = aggregateCompanyDonut(raw)
    const slice10 = result.find((s) => s.companyId === 10)!
    const slice20 = result.find((s) => s.companyId === 20)!
    expect(slice10.fill).toBe(COMPANY_BASE_PALETTE[0]) // index 0
    expect(slice20.fill).toBe(COMPANY_BASE_PALETTE[1]) // index 1
  })

  it('sets fillLight for each slice', () => {
    const raw = [makeRaw({ companyId: 1, currencyId: 2, count: 10 })]
    const result = aggregateCompanyDonut(raw)
    expect(result[0].fillLight).toBe(COMPANY_LIGHT_PALETTE[0])
  })

  it('preserves companyId, companyName, count and exposes copTotal/foreignUsd in output slices', () => {
    const raw = [makeRaw({ companyId: 5, companyName: 'TRINITY', currencyId: 2, count: 10, totalValue: 50000 })]
    const result = aggregateCompanyDonut(raw)
    expect(result[0].companyId).toBe(5)
    expect(result[0].companyName).toBe('TRINITY')
    expect(result[0].count).toBe(10)
    expect(result[0].foreignUsd).toBe(50000)
    expect(result[0].copTotal).toBe(0)
  })
})
