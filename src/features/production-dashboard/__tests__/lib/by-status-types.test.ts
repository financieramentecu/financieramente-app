/**
 * Tests for StatusDonut types and constants.
 * Validates the shape of the type contract without requiring runtime execution.
 * These are pure compile-time + constant-value tests.
 */
import { describe, it, expect } from 'vitest'
import {
  STATUS_DONUT_ALLOWED,
} from '../../types/production-kpi.types'

describe('STATUS_DONUT_ALLOWED', () => {
  it('contains exactly four statuses', () => {
    expect(STATUS_DONUT_ALLOWED).toHaveLength(4)
  })

  it('includes VENTA_EFECTUADA', () => {
    expect(STATUS_DONUT_ALLOWED).toContain('VENTA_EFECTUADA')
  })

  it('includes EMITIDO', () => {
    expect(STATUS_DONUT_ALLOWED).toContain('EMITIDO')
  })

  it('includes FONDEADO', () => {
    expect(STATUS_DONUT_ALLOWED).toContain('FONDEADO')
  })

  it('includes CARTERA', () => {
    expect(STATUS_DONUT_ALLOWED).toContain('CARTERA')
  })

  it('does not include CANCELADO or LIQUIDADO', () => {
    expect(STATUS_DONUT_ALLOWED).not.toContain('CANCELADO')
    expect(STATUS_DONUT_ALLOWED).not.toContain('LIQUIDADO')
  })
})
