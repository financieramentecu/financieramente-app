/**
 * Tests for aggregateStatusDonut pure function.
 * Covers: empty input, single status, three-status distribution,
 * sub-1% precision, fill from STATUS_COLORS, label from STATUS_DISPLAY_LABELS.
 */
import { describe, it, expect } from 'vitest'
import { aggregateStatusDonut } from '../../lib/by-status-aggregate'
import { STATUS_COLORS, STATUS_DISPLAY_LABELS } from '../../lib/by-status-colors'
import type { StatusDonutRaw } from '../../types/production-kpi.types'

describe('aggregateStatusDonut', () => {
  it('returns [] for empty input', () => {
    const result = aggregateStatusDonut([], null)
    expect(result).toEqual([])
  })

  it('returns a single slice at 100% when only one status has businesses', () => {
    const raw: StatusDonutRaw[] = [{ status: 'VENTA_EFECTUADA', count: 50, currencyId: 1, totalValue: 0 }]
    const result = aggregateStatusDonut(raw, null)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('VENTA_EFECTUADA')
    expect(result[0].count).toBe(50)
    expect(result[0].percentage).toBe(100)
  })

  it('attaches the correct fill from STATUS_COLORS', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 10, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 10, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 10, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    const ventaSlice = result.find((s) => s.status === 'VENTA_EFECTUADA')!
    const emitidoSlice = result.find((s) => s.status === 'EMITIDO')!
    const fondeadoSlice = result.find((s) => s.status === 'FONDEADO')!
    expect(ventaSlice.fill).toBe(STATUS_COLORS.VENTA_EFECTUADA)
    expect(emitidoSlice.fill).toBe(STATUS_COLORS.EMITIDO)
    expect(fondeadoSlice.fill).toBe(STATUS_COLORS.FONDEADO)
  })

  it('attaches the correct label from STATUS_DISPLAY_LABELS', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 10, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 10, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 10, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    expect(result.find((s) => s.status === 'VENTA_EFECTUADA')!.label).toBe(STATUS_DISPLAY_LABELS.VENTA_EFECTUADA)
    expect(result.find((s) => s.status === 'EMITIDO')!.label).toBe(STATUS_DISPLAY_LABELS.EMITIDO)
    expect(result.find((s) => s.status === 'FONDEADO')!.label).toBe(STATUS_DISPLAY_LABELS.FONDEADO)
  })

  it('computes correct percentages for 35/45/20 distribution', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 35, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 45, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 20, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    expect(result.find((s) => s.status === 'VENTA_EFECTUADA')!.percentage).toBe(35)
    expect(result.find((s) => s.status === 'EMITIDO')!.percentage).toBe(45)
    expect(result.find((s) => s.status === 'FONDEADO')!.percentage).toBe(20)
  })

  it('percentages sum to exactly 100 for three-status distribution', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 33, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 33, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 34, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    const sum = result.reduce((acc, s) => acc + s.percentage, 0)
    expect(sum).toBe(100)
  })

  it('handles sub-1% segment — shows 0.3% for 1 out of 333 businesses', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 1, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 332, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    const tiny = result.find((s) => s.status === 'VENTA_EFECTUADA')!
    // 1/333 = 0.3003... → should round to 0.3
    expect(tiny.percentage).toBe(0.3)
  })

  it('percentages sum to 100 even with rounding (largest-remainder correction)', () => {
    // Classic rounding problem: 1/3 each = 33.3+33.3+33.3 = 99.9 → correction needed.
    // The largest-remainder algorithm assigns one extra 0.1 to one slice,
    // giving 33.4+33.3+33.3. Due to IEEE 754 float representation, the reduce
    // may return 99.999... which rounds to 100 at display precision.
    // We assert the sum is within 0.1 of 100 (the display contract), not exact float equality.
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 1, currencyId: 1, totalValue: 0 },
      { status: 'EMITIDO', count: 1, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 1, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    // Each slice is 33.3 or 33.4 — at least 33% and at most 33.5%
    result.forEach((s) => {
      expect(s.percentage).toBeGreaterThanOrEqual(33.3)
      expect(s.percentage).toBeLessThanOrEqual(33.5)
    })
    // Total rounded to display precision (1 decimal) equals 100
    const displaySum = parseFloat(result.reduce((acc, s) => acc + s.percentage, 0).toFixed(1))
    expect(displaySum).toBe(100)
  })

  it('returns [] when total count is zero', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 0, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    expect(result).toEqual([])
  })

  it('handles two-status distribution summing to 100%', () => {
    const raw: StatusDonutRaw[] = [
      { status: 'VENTA_EFECTUADA', count: 60, currencyId: 1, totalValue: 0 },
      { status: 'FONDEADO', count: 40, currencyId: 1, totalValue: 0 },
    ]
    const result = aggregateStatusDonut(raw, null)
    expect(result).toHaveLength(2)
    const sum = result.reduce((acc, s) => acc + s.percentage, 0)
    expect(sum).toBe(100)
    expect(result.find((s) => s.status === 'VENTA_EFECTUADA')!.percentage).toBe(60)
    expect(result.find((s) => s.status === 'FONDEADO')!.percentage).toBe(40)
  })
})
