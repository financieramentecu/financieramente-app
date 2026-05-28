import { describe, it, expect } from 'vitest'
import { formatUsd, formatCop, formatUsdCompact } from '../../lib/format-currency'

describe('formatUsd', () => {
  it('formats 185000 as "USD 185.000,00" in es-CO locale', () => {
    expect(formatUsd(185000)).toBe('USD 185.000,00')
  })

  it('formats 0 correctly', () => {
    expect(formatUsd(0)).toBe('USD 0,00')
  })

  it('formats fractional USD values with 2 decimal places', () => {
    expect(formatUsd(1234.56)).toBe('USD 1.234,56')
  })
})

describe('formatCop', () => {
  it('formats 292815000 as "COP 292.815.000" in es-CO locale', () => {
    expect(formatCop(292815000)).toBe('COP 292.815.000')
  })

  it('formats 0 correctly', () => {
    expect(formatCop(0)).toBe('COP 0')
  })
})

describe('formatUsdCompact', () => {
  it('returns a compact representation prefixed with USD', () => {
    const result = formatUsdCompact(185000)
    expect(result.startsWith('USD ')).toBe(true)
    // Compact form uses K or similar suffix
    expect(result.length).toBeLessThan('USD 185.000,00'.length)
  })
})
