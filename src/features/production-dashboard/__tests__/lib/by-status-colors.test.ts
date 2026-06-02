/**
 * Tests for by-status-colors constants.
 * Verifies exact color hex values per spec and display labels.
 */
import { describe, it, expect } from 'vitest'
import { STATUS_COLORS, STATUS_DISPLAY_LABELS } from '../../lib/by-status-colors'

describe('STATUS_COLORS', () => {
  it('maps VENTA_EFECTUADA to orange-500 (#f97316)', () => {
    expect(STATUS_COLORS.VENTA_EFECTUADA).toBe('#f97316')
  })

  it('maps EMITIDO to blue-500 (#3b82f6)', () => {
    expect(STATUS_COLORS.EMITIDO).toBe('#3b82f6')
  })

  it('maps FONDEADO to green-500 (#22c55e)', () => {
    expect(STATUS_COLORS.FONDEADO).toBe('#22c55e')
  })

  it('contains exactly three entries', () => {
    expect(Object.keys(STATUS_COLORS)).toHaveLength(3)
  })
})

describe('STATUS_DISPLAY_LABELS', () => {
  it('maps VENTA_EFECTUADA to "Venta Efectuada"', () => {
    expect(STATUS_DISPLAY_LABELS.VENTA_EFECTUADA).toBe('Venta Efectuada')
  })

  it('maps EMITIDO to "Emitido"', () => {
    expect(STATUS_DISPLAY_LABELS.EMITIDO).toBe('Emitido')
  })

  it('maps FONDEADO to "Fondeado"', () => {
    expect(STATUS_DISPLAY_LABELS.FONDEADO).toBe('Fondeado')
  })

  it('contains exactly three entries', () => {
    expect(Object.keys(STATUS_DISPLAY_LABELS)).toHaveLength(3)
  })
})
