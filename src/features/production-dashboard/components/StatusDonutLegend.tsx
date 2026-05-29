'use client'

import type { StatusDonutSlice } from '../types/production-kpi.types'

interface StatusDonutLegendProps {
  readonly slices: readonly StatusDonutSlice[]
}

/**
 * Custom legend for the Status Donut chart.
 * Format: color swatch + "LABEL" + "PCT%"
 * Example: "● Venta Efectuada  35%"
 *
 * Pure component — no hooks, no Recharts Legend dependency.
 * Empty slices array renders nothing.
 */
export function StatusDonutLegend({ slices }: StatusDonutLegendProps) {
  if (slices.length === 0) return null

  return (
    <ul className="mt-4 space-y-1.5 text-sm">
      {slices.map((slice) => (
        <li key={slice.status} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: slice.fill }}
            aria-hidden="true"
          />
          <span className="text-foreground">{slice.label}</span>
          <span className="ml-auto text-muted-foreground tabular-nums">
            {slice.percentage}%
          </span>
        </li>
      ))}
    </ul>
  )
}
