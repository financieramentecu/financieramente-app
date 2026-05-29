import { describe, it, expect } from 'vitest'
import { classifyGroupByResults } from '../../lib/currency-classifier'

// Minimal shape matching what Prisma groupBy returns
type GroupByRow = {
  idCurrency: number | null
  _count: { idBusiness: number }
  _sum: { value: unknown }
}

const COP_ID = 1
const USD_ID = 2

function makeRow(idCurrency: number | null, value: unknown, count = 1): GroupByRow {
  return {
    idCurrency,
    _count: { idBusiness: count },
    _sum: { value },
  }
}

describe('classifyGroupByResults', () => {
  it('classifies rows with copCurrencyId as national', () => {
    const rows: GroupByRow[] = [makeRow(COP_ID, 1000, 3)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalCop).toBe(1000)
    expect(result.nationalCount).toBe(3)
    expect(result.totalForeignUsd).toBe(0)
    expect(result.foreignCount).toBe(0)
  })

  it('classifies rows with non-COP idCurrency as foreign', () => {
    const rows: GroupByRow[] = [makeRow(USD_ID, 500, 2)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalForeignUsd).toBe(500)
    expect(result.foreignCount).toBe(2)
    expect(result.totalCop).toBe(0)
    expect(result.nationalCount).toBe(0)
  })

  it('handles mixed national and foreign rows', () => {
    const rows: GroupByRow[] = [makeRow(COP_ID, 8100000, 5), makeRow(USD_ID, 500, 2)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalCop).toBe(8100000)
    expect(result.nationalCount).toBe(5)
    expect(result.totalForeignUsd).toBe(500)
    expect(result.foreignCount).toBe(2)
  })

  it('handles Decimal-like objects with toNumber() method', () => {
    const decimalLike = { toNumber: () => 9999 }
    const rows: GroupByRow[] = [makeRow(COP_ID, decimalLike, 1)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalCop).toBe(9999)
  })

  it('handles null _sum.value as 0', () => {
    const rows: GroupByRow[] = [makeRow(COP_ID, null, 1)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalCop).toBe(0)
  })

  it('handles undefined _sum.value as 0', () => {
    const rows: GroupByRow[] = [makeRow(COP_ID, undefined, 1)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalCop).toBe(0)
  })

  it('handles null idCurrency as foreign', () => {
    const rows: GroupByRow[] = [makeRow(null, 300, 1)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalForeignUsd).toBe(300)
    expect(result.foreignCount).toBe(1)
  })

  it('returns zero ProductionKpiRaw for empty groups array', () => {
    const result = classifyGroupByResults([], COP_ID)
    expect(result).toEqual({
      totalCop: 0,
      totalForeignUsd: 0,
      nationalCount: 0,
      foreignCount: 0,
    })
  })

  it('accumulates multiple foreign currency rows', () => {
    const rows: GroupByRow[] = [makeRow(USD_ID, 300, 1), makeRow(3, 200, 2)]
    const result = classifyGroupByResults(rows, COP_ID)
    expect(result.totalForeignUsd).toBe(500)
    expect(result.foreignCount).toBe(3)
  })
})
