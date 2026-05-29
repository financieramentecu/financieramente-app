'use client'

import type { CompanyDonutSlice } from '../types/production-kpi.types'

interface TooltipPayloadEntry {
  payload?: CompanyDonutSlice
}

interface CompanyDonutTooltipProps {
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

export function CompanyDonutTooltip({ active, payload, trmRate }: CompanyDonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const slice = payload[0]?.payload
  if (!slice) return null

  const isCop = slice.currencySymbol === 'COP'
  const usdValue = isCop
    ? trmRate ? slice.totalValue / trmRate : null
    : slice.totalValue
  const copValue = isCop ? slice.totalValue : null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-semibold text-foreground">
        {slice.companyName} · {slice.currencySymbol}
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
