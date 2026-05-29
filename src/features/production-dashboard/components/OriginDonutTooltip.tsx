'use client'

import type { OriginDonutSlice } from '../types/production-kpi.types'

interface TooltipPayloadEntry {
  payload?: OriginDonutSlice
}

interface OriginDonutTooltipProps {
  readonly active?: boolean
  readonly payload?: TooltipPayloadEntry[]
  readonly trmRate?: number | null
}

function formatCOP(value: number): string {
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)} COP`
}

function formatUSD(value: number): string {
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value)} USD`
}

export function OriginDonutTooltip({ active, payload, trmRate }: OriginDonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const slice = payload[0]?.payload
  if (!slice) return null

  const isCop = slice.currencySymbol === 'COP'

  // USD is always the primary display
  const usdValue = isCop
    ? trmRate ? slice.totalValue / trmRate : null
    : slice.totalValue

  // COP reference only for COP segments (shows original value before conversion)
  const copValue = isCop ? slice.totalValue : null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-semibold text-foreground">
        {slice.originName} · {slice.currencySymbol}
      </p>
      <p className="text-muted-foreground">
        {slice.count} {slice.count === 1 ? 'negocio' : 'negocios'} ({slice.percentage.toFixed(1)}%)
      </p>
      {usdValue !== null && (
        <p className="text-foreground">{formatUSD(usdValue)}</p>
      )}
      {copValue !== null && (
        <p className="text-muted-foreground text-xs">≈ {formatCOP(copValue)}</p>
      )}
    </div>
  )
}
