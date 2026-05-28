/**
 * Pure aggregation helper for the Origin Donut chart.
 * Converts OriginDonutRaw[] (from the API) into OriginDonutSlice[] (for the chart).
 * No React, no Prisma, no side effects.
 */

import {
  resolveDonutColor,
  buildOriginPaletteMap,
  ORIGIN_LIGHT_PALETTE,
} from './origin-donut-colors'
import type { OriginDonutRaw, OriginDonutSlice } from '../types/production-kpi.types'

/**
 * Aggregates raw service data into chart-ready slices.
 *
 * - Returns `[]` when `raw` is empty or when all counts are zero.
 * - Computes `percentage = (count / totalCount) * 100` rounded to 1 decimal.
 * - Attaches `fill` (base or light palette) and `fillLight` (always light palette).
 * - Origin → palette index mapping is stable: sorted ascending by originId.
 *
 * @param raw  Raw rows from the API (OriginDonutRaw[]). No mutations.
 */
export function aggregateOriginDonut(raw: readonly OriginDonutRaw[]): OriginDonutSlice[] {
  if (raw.length === 0) return []

  const totalCount = raw.reduce((sum, r) => sum + r.count, 0)
  if (totalCount === 0) return []

  const paletteMap = buildOriginPaletteMap(raw.map((r) => r.originId))

  return raw.map((r) => {
    const paletteIndex = paletteMap.get(r.originId) ?? 0
    const fill = resolveDonutColor(paletteIndex, r.currencyId)
    const fillLight = ORIGIN_LIGHT_PALETTE[paletteIndex % ORIGIN_LIGHT_PALETTE.length]
    const percentage = Math.round((r.count / totalCount) * 1000) / 10

    return {
      ...r,
      percentage,
      fill,
      fillLight,
    } satisfies OriginDonutSlice
  })
}
