/**
 * Pure aggregation helper for the Origin Donut chart.
 * Converts OriginDonutRaw[] (from the API) into OriginDonutSlice[] (for the chart).
 * No React, no Prisma, no side effects.
 *
 * Merging: multiple (origin × currency) raw rows are reduced to one slice per origin.
 * COP values accumulate in copTotal; non-COP (USD) values accumulate in foreignUsd.
 */

import {
  resolveDonutColor,
  buildOriginPaletteMap,
  ORIGIN_LIGHT_PALETTE,
} from './origin-donut-colors'
import type { OriginDonutRaw, OriginDonutSlice } from '../types/production-kpi.types'

const COP_CURRENCY_ID = 1

type OriginBucket = {
  originId: number
  originName: string
  count: number
  copCount: number
  copTotal: number
  foreignUsd: number
}

/**
 * Aggregates raw service data into chart-ready slices.
 *
 * - Returns `[]` when `raw` is empty or when all counts are zero.
 * - Merges (origin × currency) rows into one slice per originId.
 * - Computes `percentage = (count / totalCount) * 100` rounded to 1 decimal.
 * - Attaches `fill` (base palette) and `fillLight` (always light palette).
 * - Origin → palette index mapping is stable: sorted ascending by originId.
 *
 * @param raw  Raw rows from the API (OriginDonutRaw[]). No mutations.
 */
export function aggregateOriginDonut(raw: readonly OriginDonutRaw[]): OriginDonutSlice[] {
  if (raw.length === 0) return []

  // Merge (origin × currency) rows → one bucket per originId
  const buckets = new Map<number, OriginBucket>()

  for (const r of raw) {
    const existing = buckets.get(r.originId)
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
      buckets.set(r.originId, {
        originId: r.originId,
        originName: r.originName,
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

  const paletteMap = buildOriginPaletteMap(merged.map((b) => b.originId))

  return merged.map((b) => {
    const paletteIndex = paletteMap.get(b.originId) ?? 0
    // Always use the base (non-COP) color since currencies are merged into one slice
    const fill = resolveDonutColor(paletteIndex, 2)
    const fillLight = ORIGIN_LIGHT_PALETTE[paletteIndex % ORIGIN_LIGHT_PALETTE.length]
    const percentage = Math.round((b.count / totalCount) * 1000) / 10

    return {
      originId: b.originId,
      originName: b.originName,
      count: b.count,
      copCount: b.copCount,
      copTotal: b.copTotal,
      foreignUsd: b.foreignUsd,
      percentage,
      fill,
      fillLight,
    } satisfies OriginDonutSlice
  })
}
