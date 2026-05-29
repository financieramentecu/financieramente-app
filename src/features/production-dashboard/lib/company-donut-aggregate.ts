/**
 * Pure aggregation helper for the Company Donut chart.
 * Converts CompanyDonutRaw[] (from the API) into CompanyDonutSlice[] (for the chart).
 * No React, no Prisma, no side effects.
 *
 * Merging: multiple (company × currency) raw rows are reduced to one slice per company.
 * COP values accumulate in copTotal; non-COP (USD) values accumulate in foreignUsd.
 */

import {
  resolveCompanyColor,
  buildCompanyPaletteMap,
  COMPANY_LIGHT_PALETTE,
} from './company-donut-colors'
import type { CompanyDonutRaw, CompanyDonutSlice } from '../types/production-kpi.types'

const COP_CURRENCY_ID = 1

type CompanyBucket = {
  companyId: number
  companyName: string
  count: number
  copCount: number
  copTotal: number
  foreignUsd: number
}

/**
 * Aggregates raw service data into chart-ready slices.
 *
 * - Returns `[]` when `raw` is empty or when all counts are zero.
 * - Merges (company × currency) rows into one slice per companyId.
 * - Computes `percentage = (count / totalCount) * 100` rounded to 1 decimal.
 * - Attaches `fill` (base palette) and `fillLight` (always light palette).
 * - Company → palette index mapping is stable: sorted ascending by companyId.
 *
 * @param raw  Raw rows from the API (CompanyDonutRaw[]). No mutations.
 */
export function aggregateCompanyDonut(raw: readonly CompanyDonutRaw[]): CompanyDonutSlice[] {
  if (raw.length === 0) return []

  // Merge (company × currency) rows → one bucket per companyId
  const buckets = new Map<number, CompanyBucket>()

  for (const r of raw) {
    const existing = buckets.get(r.companyId)
    const isCop = r.currencyId === COP_CURRENCY_ID
    if (existing) {
      existing.count += r.count
      if (isCop) {
        existing.copCount += r.count
        existing.copTotal += r.totalValue
      } else {
        existing.foreignUsd += r.totalValue
      }
    } else {
      buckets.set(r.companyId, {
        companyId: r.companyId,
        companyName: r.companyName,
        count: r.count,
        copCount: isCop ? r.count : 0,
        copTotal: isCop ? r.totalValue : 0,
        foreignUsd: isCop ? 0 : r.totalValue,
      })
    }
  }

  const merged = [...buckets.values()]

  const totalCount = merged.reduce((sum, b) => sum + b.count, 0)
  if (totalCount === 0) return []

  const paletteMap = buildCompanyPaletteMap(merged.map((b) => b.companyId))

  return merged.map((b) => {
    const paletteIndex = paletteMap.get(b.companyId) ?? 0
    // Always use the base (non-COP) color since currencies are merged into one slice
    const fill = resolveCompanyColor(paletteIndex, 2)
    const fillLight = COMPANY_LIGHT_PALETTE[paletteIndex % COMPANY_LIGHT_PALETTE.length]
    const percentage = Math.round((b.count / totalCount) * 1000) / 10

    return {
      companyId: b.companyId,
      companyName: b.companyName,
      count: b.count,
      copCount: b.copCount,
      copTotal: b.copTotal,
      foreignUsd: b.foreignUsd,
      percentage,
      fill,
      fillLight,
    } satisfies CompanyDonutSlice
  })
}
