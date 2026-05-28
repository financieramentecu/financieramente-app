import { describe, it, expect } from 'vitest'
import {
  ORIGIN_BASE_PALETTE,
  ORIGIN_LIGHT_PALETTE,
  COP_CURRENCY_ID,
  resolveDonutColor,
  buildOriginPaletteMap,
} from '../../lib/origin-donut-colors'

describe('ORIGIN_BASE_PALETTE and ORIGIN_LIGHT_PALETTE', () => {
  it('have the same length', () => {
    expect(ORIGIN_BASE_PALETTE.length).toBe(ORIGIN_LIGHT_PALETTE.length)
  })

  it('have at least 8 entries', () => {
    expect(ORIGIN_BASE_PALETTE.length).toBeGreaterThanOrEqual(8)
  })
})

describe('COP_CURRENCY_ID', () => {
  it('equals 1 (matches the database value)', () => {
    expect(COP_CURRENCY_ID).toBe(1)
  })
})

describe('resolveDonutColor', () => {
  it('returns the light palette for COP currency', () => {
    const result = resolveDonutColor(0, COP_CURRENCY_ID)
    expect(result).toBe(ORIGIN_LIGHT_PALETTE[0])
  })

  it('returns the base palette for non-COP currency (USD = 2)', () => {
    const result = resolveDonutColor(0, 2)
    expect(result).toBe(ORIGIN_BASE_PALETTE[0])
  })

  it('returns the base palette for any other non-COP currency', () => {
    const result = resolveDonutColor(3, 99)
    expect(result).toBe(ORIGIN_BASE_PALETTE[3])
  })

  it('wraps modulo correctly when paletteIndex equals palette length', () => {
    const paletteLength = ORIGIN_BASE_PALETTE.length
    const result = resolveDonutColor(paletteLength, 2)
    // Index paletteLength % paletteLength = 0
    expect(result).toBe(ORIGIN_BASE_PALETTE[0])
  })

  it('wraps modulo correctly when paletteIndex exceeds palette length', () => {
    const paletteLength = ORIGIN_BASE_PALETTE.length
    const result = resolveDonutColor(paletteLength + 2, COP_CURRENCY_ID)
    expect(result).toBe(ORIGIN_LIGHT_PALETTE[2])
  })

  it('same paletteIndex always returns same color (deterministic)', () => {
    const a = resolveDonutColor(1, 2)
    const b = resolveDonutColor(1, 2)
    expect(a).toBe(b)
  })
})

describe('buildOriginPaletteMap', () => {
  it('returns an empty Map for empty input', () => {
    const result = buildOriginPaletteMap([])
    expect(result.size).toBe(0)
  })

  it('assigns sequential indices starting from 0', () => {
    const map = buildOriginPaletteMap([10, 20, 30])
    expect(map.get(10)).toBe(0)
    expect(map.get(20)).toBe(1)
    expect(map.get(30)).toBe(2)
  })

  it('is stable regardless of input order (same ids → same indices)', () => {
    const mapA = buildOriginPaletteMap([30, 10, 20])
    const mapB = buildOriginPaletteMap([10, 20, 30])
    // Both should produce the same mapping since we sort ascending internally
    expect(mapA.get(10)).toBe(mapB.get(10))
    expect(mapA.get(20)).toBe(mapB.get(20))
    expect(mapA.get(30)).toBe(mapB.get(30))
  })

  it('deduplicates origin ids', () => {
    const map = buildOriginPaletteMap([10, 10, 20])
    expect(map.size).toBe(2)
    expect(map.get(10)).toBe(0)
    expect(map.get(20)).toBe(1)
  })

  it('sorts ascending so lowest id always gets index 0', () => {
    const map = buildOriginPaletteMap([100, 5, 50])
    expect(map.get(5)).toBe(0)
    expect(map.get(50)).toBe(1)
    expect(map.get(100)).toBe(2)
  })
})
