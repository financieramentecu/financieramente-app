/**
 * Pure function to classify Prisma groupBy results by currency.
 * Uses idCurrency directly (no symbol/name sniffing per design ADR).
 * DRY extraction from negocios/stats/route.ts heuristic.
 */

import type { ProductionKpiRaw } from '../types/production-kpi.types'

/** Minimal shape from Prisma Business.groupBy({ by: ['idCurrency'], _count, _sum }) */
export interface GroupByRow {
  idCurrency: number | null
  _count: { idBusiness: number }
  _sum: { value: unknown }
}

/**
 * Coerces a Prisma Decimal, number, null, or undefined to a safe JS number.
 */
function coerceValue(raw: unknown): number {
  if (raw === null || raw === undefined) return 0
  if (typeof raw === 'object' && raw !== null && 'toNumber' in raw) {
    return (raw as { toNumber(): number }).toNumber()
  }
  const n = Number(raw)
  return isNaN(n) ? 0 : n
}

/**
 * Classifies groupBy rows into national (COP) vs foreign totals.
 *
 * @param groups   Array of Prisma groupBy result rows.
 * @param copCurrencyId  The idCurrency that represents COP.
 * @returns ProductionKpiRaw with separated national / foreign totals and counts.
 */
export function classifyGroupByResults(
  groups: GroupByRow[],
  copCurrencyId: number
): ProductionKpiRaw {
  let totalCop = 0
  let totalForeignUsd = 0
  let nationalCount = 0
  let foreignCount = 0

  for (const group of groups) {
    const value = coerceValue(group._sum.value)
    const count = group._count.idBusiness

    if (group.idCurrency === copCurrencyId) {
      totalCop += value
      nationalCount += count
    } else {
      totalForeignUsd += value
      foreignCount += count
    }
  }

  return { totalCop, totalForeignUsd, nationalCount, foreignCount }
}
