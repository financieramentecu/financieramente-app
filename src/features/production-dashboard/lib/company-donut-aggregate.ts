/**
 * Pure aggregation helper for the Company Donut chart.
 * Converts CompanyDonutRaw[] (from the API) into CompanyDonutSlice[] (for the chart).
 * No React, no Prisma, no side effects.
 */

import {
  resolveCompanyColor,
  buildCompanyPaletteMap,
  COMPANY_LIGHT_PALETTE,
} from './company-donut-colors'
import type { CompanyDonutRaw, CompanyDonutSlice } from '../types/production-kpi.types'

/**
 * Aggregates raw service data into chart-ready slices.
 *
 * - Returns `[]` when `raw` is empty or when all counts are zero.
 * - Computes `percentage = (count / totalCount) * 100` rounded to 1 decimal.
 * - Attaches `fill` (base or light palette) and `fillLight` (always light palette).
 * - Company → palette index mapping is stable: sorted ascending by companyId.
 *
 * @param raw  Raw rows from the API (CompanyDonutRaw[]). No mutations.
 */
export function aggregateCompanyDonut(raw: readonly CompanyDonutRaw[]): CompanyDonutSlice[] {
  if (raw.length === 0) return []

  const totalCount = raw.reduce((sum, r) => sum + r.count, 0)
  if (totalCount === 0) return []

  const paletteMap = buildCompanyPaletteMap(raw.map((r) => r.companyId))

  return raw.map((r) => {
    const paletteIndex = paletteMap.get(r.companyId) ?? 0
    const fill = resolveCompanyColor(paletteIndex, r.currencyId)
    const fillLight = COMPANY_LIGHT_PALETTE[paletteIndex % COMPANY_LIGHT_PALETTE.length]
    const percentage = Math.round((r.count / totalCount) * 1000) / 10

    return {
      ...r,
      percentage,
      fill,
      fillLight,
    } satisfies CompanyDonutSlice
  })
}
