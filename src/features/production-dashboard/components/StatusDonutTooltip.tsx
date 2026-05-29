'use client'

import type { StatusDonutSlice } from '../types/production-kpi.types'

interface TooltipPayloadEntry {
  payload?: StatusDonutSlice
}

interface StatusDonutTooltipProps {
  readonly active?: boolean
  readonly payload?: TooltipPayloadEntry[]
  readonly trmRate?: number | null
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Custom tooltip for the Status Donut chart.
 * Format: entity name header, "COUNT negocios (PCT%)", optional total USD, optional COP breakdown.
 * Disappears on mouse-out (controlled by Recharts active prop).
 * No default Recharts tooltip used.
 */
export function StatusDonutTooltip({ active, payload, trmRate }: StatusDonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const slice = payload[0]?.payload
  if (!slice) return null

  const copUsd = trmRate ? slice.copTotal / trmRate : null
  const totalUSD =
    copUsd !== null
      ? copUsd + slice.foreignUsd
      : slice.foreignUsd > 0
        ? slice.foreignUsd
        : null

  const foreignCount = slice.count - slice.copCount
  const foreignCountPct =
    foreignCount > 0 && slice.count > 0
      ? ((foreignCount / slice.count) * slice.percentage).toFixed(1)
      : null
  const copCountPct =
    slice.copCount > 0 && slice.count > 0
      ? ((slice.copCount / slice.count) * slice.percentage).toFixed(1)
      : null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-semibold text-foreground">{slice.label}</p>
      <p className="text-muted-foreground">
        {slice.count} {slice.count === 1 ? 'negocio' : 'negocios'} ({slice.percentage}%)
      </p>
      {totalUSD !== null && (
        <p className="text-muted-foreground">{formatUSD(totalUSD)}</p>
      )}
      {foreignCount > 0 && slice.foreignUsd > 0 && (
        <p className="text-muted-foreground text-xs">
          Moneda extranjera: {foreignCount} {foreignCount === 1 ? 'negocio' : 'negocios'} ({foreignCountPct}%) {formatUSD(slice.foreignUsd)}
        </p>
      )}
      {slice.copTotal > 0 && copUsd !== null && (
        <p className="text-muted-foreground text-xs">
          Moneda local: {slice.copCount} {slice.copCount === 1 ? 'negocio' : 'negocios'} ({copCountPct}%) ({formatUSD(copUsd)} USD) ${formatCOP(slice.copTotal)} COP
        </p>
      )}
    </div>
  )
}
