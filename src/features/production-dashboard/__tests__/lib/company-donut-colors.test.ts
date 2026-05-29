import { describe, it, expect } from 'vitest'
import {
  COMPANY_BASE_PALETTE,
  COMPANY_LIGHT_PALETTE,
  COP_CURRENCY_ID,
  resolveCompanyColor,
  buildCompanyPaletteMap,
} from '../../lib/company-donut-colors'

describe('COMPANY_BASE_PALETTE and COMPANY_LIGHT_PALETTE', () => {
  it('have the same length', () => {
    expect(COMPANY_BASE_PALETTE.length).toBe(COMPANY_LIGHT_PALETTE.length)
  })

  it('have at least 8 entries', () => {
    expect(COMPANY_BASE_PALETTE.length).toBeGreaterThanOrEqual(8)
  })

  it('uses a different palette than origin (teal/indigo family — not blue-600)', () => {
    // origin base palette[0] = '#2563eb' (blue-600); company base palette[0] = '#0d9488' (teal-600)
    expect(COMPANY_BASE_PALETTE[0]).not.toBe('#2563eb')
    expect(COMPANY_BASE_PALETTE[0]).toBe('#0d9488')
  })
})

describe('COP_CURRENCY_ID', () => {
  it('equals 1 (matches the database value)', () => {
    expect(COP_CURRENCY_ID).toBe(1)
  })
})

describe('resolveCompanyColor', () => {
  it('returns the light palette for COP currency', () => {
    const result = resolveCompanyColor(0, COP_CURRENCY_ID)
    expect(result).toBe(COMPANY_LIGHT_PALETTE[0])
  })

  it('returns the base palette for non-COP currency (USD = 2)', () => {
    const result = resolveCompanyColor(0, 2)
    expect(result).toBe(COMPANY_BASE_PALETTE[0])
  })

  it('returns the base palette for any other non-COP currency', () => {
    const result = resolveCompanyColor(3, 99)
    expect(result).toBe(COMPANY_BASE_PALETTE[3])
  })

  it('wraps modulo correctly when paletteIndex equals palette length', () => {
    const paletteLength = COMPANY_BASE_PALETTE.length
    const result = resolveCompanyColor(paletteLength, 2)
    // Index paletteLength % paletteLength = 0
    expect(result).toBe(COMPANY_BASE_PALETTE[0])
  })

  it('wraps modulo correctly when paletteIndex exceeds palette length', () => {
    const paletteLength = COMPANY_BASE_PALETTE.length
    const result = resolveCompanyColor(paletteLength + 2, COP_CURRENCY_ID)
    expect(result).toBe(COMPANY_LIGHT_PALETTE[2])
  })

  it('same paletteIndex always returns same color (deterministic)', () => {
    const a = resolveCompanyColor(1, 2)
    const b = resolveCompanyColor(1, 2)
    expect(a).toBe(b)
  })
})

describe('buildCompanyPaletteMap', () => {
  it('returns an empty Map for empty input', () => {
    const result = buildCompanyPaletteMap([])
    expect(result.size).toBe(0)
  })

  it('assigns sequential indices starting from 0', () => {
    const map = buildCompanyPaletteMap([10, 20, 30])
    expect(map.get(10)).toBe(0)
    expect(map.get(20)).toBe(1)
    expect(map.get(30)).toBe(2)
  })

  it('is stable regardless of input order (same ids → same indices)', () => {
    const mapA = buildCompanyPaletteMap([30, 10, 20])
    const mapB = buildCompanyPaletteMap([10, 20, 30])
    expect(mapA.get(10)).toBe(mapB.get(10))
    expect(mapA.get(20)).toBe(mapB.get(20))
    expect(mapA.get(30)).toBe(mapB.get(30))
  })

  it('deduplicates company ids', () => {
    const map = buildCompanyPaletteMap([10, 10, 20])
    expect(map.size).toBe(2)
    expect(map.get(10)).toBe(0)
    expect(map.get(20)).toBe(1)
  })

  it('sorts ascending so lowest id always gets index 0', () => {
    const map = buildCompanyPaletteMap([100, 5, 50])
    expect(map.get(5)).toBe(0)
    expect(map.get(50)).toBe(1)
    expect(map.get(100)).toBe(2)
  })
})
