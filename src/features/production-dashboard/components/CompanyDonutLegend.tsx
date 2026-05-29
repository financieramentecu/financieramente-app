'use client'

import type { CompanyDonutSlice } from '../types/production-kpi.types'

interface CompanyDonutLegendProps {
  readonly slices: readonly CompanyDonutSlice[]
}

/**
 * Custom legend for the Company Donut chart.
 * Renders items sorted descending by percentage.
 * Each item: color swatch + "[companyName] [currencySymbol] · XX.X%"
 *
 * Pure component — no hooks, no Recharts Legend dependency.
 * Empty slices array renders nothing.
 */
export function CompanyDonutLegend({ slices }: CompanyDonutLegendProps) {
  if (slices.length === 0) return null

  const sorted = [...slices].sort((a, b) => b.percentage - a.percentage)

  return (
    <ul className="mt-4 space-y-1.5 text-sm">
      {sorted.map((slice) => (
        <li
          key={`${slice.companyId}-${slice.currencyId}`}
          className="flex items-center gap-2"
        >
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: slice.fill }}
            aria-hidden="true"
          />
          <span className="text-foreground">
            {slice.companyName} {slice.currencySymbol}
          </span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            {slice.percentage.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  )
}
