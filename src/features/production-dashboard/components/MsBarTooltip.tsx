import { formatUsd, formatCop } from '../lib/format-currency'
import type { MsBarDatum } from '../types/production-kpi.types'

interface TooltipEntry {
  readonly dataKey: string
  readonly value: number | null
  readonly payload: MsBarDatum
}

interface MsBarTooltipProps {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<TooltipEntry>
  readonly trmRate: number | null
}

/**
 * Custom Recharts tooltip for the MS grouped bar chart.
 * Returns null (suppresses tooltip) when bar value is zero.
 * This component does not need 'use client' — it is only rendered
 * inside the client component MsGroupedBarChart.
 */
export function MsBarTooltip({ active, payload, trmRate: _trmRate }: MsBarTooltipProps) {
  if (!active || !payload?.length) return null

  const lines = payload.flatMap((entry) => {
    if (entry.dataKey === 'foreignUsd') {
      if (entry.payload.foreignUsd === 0) return []
      const usd = formatUsd(entry.payload.foreignUsd)
      const count = entry.payload.foreignCount
      return [(
        <p key="foreign" className="text-blue-600 font-medium">
          {usd} · {count} {count === 1 ? 'negocio' : 'negocios'}
        </p>
      )]
    }

    // nationalUsdDisplay bar — suppress when TRM null or display value is 0
    const datum = entry.payload
    if (datum.nationalUsd === null || datum.nationalUsdDisplay === 0) return []

    const usdVal = formatUsd(datum.nationalUsd)
    const copVal = formatCop(datum.totalCop)
    const count = datum.nationalCount
    return [(
      <p key="national" className="text-green-600 font-medium">
        {usdVal} ({copVal}) · {count} {count === 1 ? 'negocio' : 'negocios'}
      </p>
    )]
  })

  if (lines.length === 0) return null

  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1">
      {lines}
    </div>
  )
}
