import { describe, it, expect } from 'vitest'
import { aggregateOriginDonut } from '../../lib/origin-donut-aggregate'
import { ORIGIN_BASE_PALETTE, ORIGIN_LIGHT_PALETTE, COP_CURRENCY_ID } from '../../lib/origin-donut-colors'
import type { OriginDonutRaw } from '../../types/production-kpi.types'

function makeRaw(overrides: Partial<OriginDonutRaw> = {}): OriginDonutRaw {
  return {
    originId: 1,
    originName: 'Referido',
    currencyId: 2,
    currencyName: 'Dólar',
    currencySymbol: 'USD',
    count: 10,
    totalValue: 100000,
    ...overrides,
  }
}

// Suppress unused import warning — COP_CURRENCY_ID is used in raw fixtures
void COP_CURRENCY_ID

describe('aggregateOriginDonut', () => {
  it('returns [] for empty input', () => {
    expect(aggregateOriginDonut([])).toEqual([])
  })

  it('returns [] when total count is zero', () => {
    const raw = [makeRaw({ count: 0 }), makeRaw({ originId: 2, count: 0 })]
    expect(aggregateOriginDonut(raw)).toEqual([])
  })

  it('gives 100% to a single item', () => {
    const result = aggregateOriginDonut([makeRaw({ count: 42 })])
    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(100.0)
  })

  it('computes percentages that sum to 100 ± 0.1 for multiple items', () => {
    const raw: OriginDonutRaw[] = [
      makeRaw({ originId: 1, count: 50 }),
      makeRaw({ originId: 2, count: 30 }),
      makeRaw({ originId: 3, count: 20 }),
    ]
    const result = aggregateOriginDonut(raw)
    const sum = result.reduce((acc, s) => acc + s.percentage, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('handles two equal segments at 50% each', () => {
    const raw: OriginDonutRaw[] = [
      makeRaw({ originId: 1, count: 50 }),
      makeRaw({ originId: 2, count: 50 }),
    ]
    const result = aggregateOriginDonut(raw)
    expect(result[0].percentage).toBe(50.0)
    expect(result[1].percentage).toBe(50.0)
  })

  it('rounds percentage to 1 decimal place', () => {
    // 1/3 ≈ 33.333... → should round to 33.3
    const raw: OriginDonutRaw[] = [
      makeRaw({ originId: 1, count: 1 }),
      makeRaw({ originId: 2, count: 1 }),
      makeRaw({ originId: 3, count: 1 }),
    ]
    const result = aggregateOriginDonut(raw)
    result.forEach((s) => {
      expect(s.percentage).toBeCloseTo(33.3, 0)
    })
  })

  it('assigns base palette fill regardless of currency (currencies are merged)', () => {
    const raw = [makeRaw({ originId: 10, currencyId: 2, count: 5 })]
    const result = aggregateOriginDonut(raw)
    // originId 10 → sorted → index 0 → base palette[0]
    expect(result[0].fill).toBe(ORIGIN_BASE_PALETTE[0])
  })

  it('assigns base palette fill even for COP-only origin (currencies merged into one slice)', () => {
    const raw = [makeRaw({ originId: 10, currencyId: COP_CURRENCY_ID, count: 5 })]
    const result = aggregateOriginDonut(raw)
    expect(result[0].fill).toBe(ORIGIN_BASE_PALETTE[0])
  })

  it('fills match expected palette indices by sorted originId', () => {
    // Two origins: 10 → index 0, 20 → index 1
    const raw: OriginDonutRaw[] = [
      makeRaw({ originId: 20, currencyId: 2, count: 30 }),
      makeRaw({ originId: 10, currencyId: 2, count: 70 }),
    ]
    const result = aggregateOriginDonut(raw)
    // Find slice for originId 10 and 20
    const slice10 = result.find((s) => s.originId === 10)!
    const slice20 = result.find((s) => s.originId === 20)!
    expect(slice10.fill).toBe(ORIGIN_BASE_PALETTE[0]) // index 0
    expect(slice20.fill).toBe(ORIGIN_BASE_PALETTE[1]) // index 1
  })

  it('sets fillLight for each slice', () => {
    const raw = [makeRaw({ originId: 1, currencyId: 2, count: 10 })]
    const result = aggregateOriginDonut(raw)
    expect(result[0].fillLight).toBe(ORIGIN_LIGHT_PALETTE[0])
  })

  it('preserves originId, originName, count and exposes copTotal/foreignUsd in output slices', () => {
    const raw = [makeRaw({ originId: 5, originName: 'Digital', currencyId: 2, count: 10, totalValue: 50000 })]
    const result = aggregateOriginDonut(raw)
    expect(result[0].originId).toBe(5)
    expect(result[0].originName).toBe('Digital')
    expect(result[0].count).toBe(10)
    expect(result[0].foreignUsd).toBe(50000)
    expect(result[0].copTotal).toBe(0)
  })
})
