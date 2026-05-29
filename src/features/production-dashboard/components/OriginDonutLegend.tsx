'use client'

import type { OriginDonutSlice } from '../types/production-kpi.types'

interface OriginDonutLegendProps {
  readonly slices: readonly OriginDonutSlice[]
}

/**
 * Custom legend for the Origin Donut chart.
 * Renders items sorted descending by percentage.
 * Each item: color swatch + "[originName] · XX.X%"
 *
 * Pure component — no hooks, no Recharts Legend dependency.
 * Empty slices array renders nothing.
 */
export function OriginDonutLegend({ slices }: OriginDonutLegendProps) {
  if (slices.length === 0) return null

  const sorted = [...slices].sort((a, b) => b.percentage - a.percentage)

  return (
    <ul className="mt-4 space-y-1.5 text-sm">
      {sorted.map((slice) => (
        <li
          key={String(slice.originId)}
          className="flex items-center gap-2"
        >
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: slice.fill }}
            aria-hidden="true"
          />
          <span className="text-foreground">
            {slice.originName}
          </span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            {slice.percentage.toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  )
}
