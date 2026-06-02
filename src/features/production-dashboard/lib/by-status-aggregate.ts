/**
 * Pure aggregation helper for the Status Donut chart.
 * Converts StatusDonutRaw[] (from the API) into StatusDonutSlice[] (for the chart).
 * No React, no Prisma, no side effects.
 *
 * Merging: multiple (status × currency) raw rows are reduced to one slice per status.
 * Counts are summed; COP values are converted to USD via trmRate before summing (for totalUSD metadata only).
 *
 * Percentage algorithm: percentage is based on count so the pie visual (dataKey="count")
 * and legend percentages are always consistent. Largest-remainder method ensures the sum
 * is always exactly 100 (at 1-decimal precision).
 */

import { STATUS_COLORS, STATUS_DISPLAY_LABELS } from './by-status-colors'
import { STATUS_DONUT_ALLOWED } from '../types/production-kpi.types'
import type { StatusDonutKey, StatusDonutRaw, StatusDonutSlice } from '../types/production-kpi.types'

/** The idCurrency value that represents COP in the database. */
const COP_CURRENCY_ID = 1

type MergedBucket = {
  status: StatusDonutKey
  count: number
  copCount: number
  totalUSD: number
  copTotal: number
  foreignUsd: number
}

/**
 * Aggregates raw service data into chart-ready slices.
 *
 * - Returns `[]` when `raw` is empty or when total count is zero.
 * - Merges multiple (status × currency) rows into one slice per status.
 * - COP values are converted to USD for the `totalUSD` metadata field: totalValue / trmRate.
 *   If trmRate is null or 0, COP rows contribute 0 USD (graceful degradation).
 * - Computes `percentage` from count (consistent with the pie chart's dataKey="count").
 * - Uses largest-remainder so percentages sum to exactly 100.
 * - Attaches `fill` from `STATUS_COLORS` and `label` from `STATUS_DISPLAY_LABELS`.
 *
 * @param raw      Raw rows from the API (StatusDonutRaw[]). No mutations.
 * @param trmRate  TRM exchange rate (COP per 1 USD). Null when unavailable.
 */
export function aggregateStatusDonut(
  raw: readonly StatusDonutRaw[],
  trmRate: number | null
): StatusDonutSlice[] {
  if (raw.length === 0) return []

  // Merge (status × currency) rows → one bucket per status
  const buckets = new Map<StatusDonutKey, MergedBucket>()

  for (const r of raw) {
    const safeValue = r.totalValue ?? 0
    const usdValue =
      r.currencyId === COP_CURRENCY_ID
        ? trmRate && trmRate > 0
          ? safeValue / trmRate
          : 0
        : safeValue

    const isCop = r.currencyId === COP_CURRENCY_ID
    const existing = buckets.get(r.status)
    if (existing) {
      existing.count += r.count
      existing.totalUSD += usdValue
      if (isCop) {
        existing.copCount += r.count
        existing.copTotal += safeValue
      } else {
        existing.foreignUsd += safeValue
      }
    } else {
      buckets.set(r.status, {
        status: r.status,
        count: r.count,
        copCount: isCop ? r.count : 0,
        totalUSD: usdValue,
        copTotal: isCop ? safeValue : 0,
        foreignUsd: isCop ? 0 : safeValue,
      })
    }
  }

  // Preserve the canonical status order defined by STATUS_DONUT_ALLOWED
  const merged = STATUS_DONUT_ALLOWED.flatMap((s) => {
    const b = buckets.get(s)
    return b ? [b] : []
  })

  if (merged.length === 0) return []

  // Percentage is count-based (consistent with pie chart dataKey="count")
  const totalCount = merged.reduce((sum, b) => sum + b.count, 0)
  if (totalCount === 0) return []

  // Compute exact (unrounded) percentages scaled to 1 decimal place
  const SCALE = 10 // 1 decimal → multiply by 10 to work in integers
  const TARGET = 1000 // 100.0 * SCALE

  // Step 1: floor each percentage × 10
  const entries = merged.map((b) => {
    const exact = (b.count / totalCount) * TARGET
    const floored = Math.floor(exact)
    const remainder = exact - floored
    return { bucket: b, floored, remainder }
  })

  // Step 2: distribute the missing budget using largest remainders
  const allocated = entries.reduce((sum, e) => sum + e.floored, 0)
  let budget = TARGET - allocated // units of 0.1%

  const sorted = [...entries].sort((a, b) => b.remainder - a.remainder)
  for (const entry of sorted) {
    if (budget <= 0) break
    entry.floored += 1
    budget -= 1
  }

  // Sanity: largest-remainder guarantees totalFloored === TARGET
  const totalFloored = entries.reduce((sum, e) => sum + e.floored, 0)
  if (totalFloored !== TARGET) {
    entries[entries.length - 1].floored += TARGET - totalFloored
  }

  return entries.map((e) => ({
    status: e.bucket.status,
    label: STATUS_DISPLAY_LABELS[e.bucket.status],
    count: e.bucket.count,
    copCount: e.bucket.copCount,
    percentage: e.floored / SCALE,
    fill: STATUS_COLORS[e.bucket.status],
    totalUSD: Math.round(e.bucket.totalUSD * 100) / 100,
    copTotal: e.bucket.copTotal,
    foreignUsd: e.bucket.foreignUsd,
  } satisfies StatusDonutSlice))
}
