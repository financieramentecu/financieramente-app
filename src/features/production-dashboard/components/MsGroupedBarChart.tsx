'use client'

import { useRef, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { MsBarTooltip } from './MsBarTooltip'
import { formatUsdCompact } from '../lib/format-currency'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { MsBarDatum } from '../types/production-kpi.types'

interface MsGroupedBarChartProps {
  readonly chartState: AsyncState<MsBarDatum[]>
  readonly trmRate: number | null
}

/** Internal skeleton shown during loading or idle state. */
function MsBarChartSkeleton() {
  return (
    <div aria-busy="true" className="rounded-xl border bg-card p-4 space-y-3">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="flex items-end gap-4 h-52 px-8">
        {[60, 80, 45, 70].map((h, i) => (
          <div key={i} className="flex gap-1 items-end">
            <div
              className="w-8 animate-pulse rounded-t bg-blue-200"
              style={{ height: `${h}%` }}
            />
            <div
              className="w-8 animate-pulse rounded-t bg-green-200"
              style={{ height: `${Math.floor(h * 0.7)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Pure renderer for the MS grouped bar chart.
 * Does not call any hooks for data fetching — receives chartState as prop.
 * Requires 'use client' because Recharts uses browser APIs.
 */
export function MsGroupedBarChart({ chartState, trmRate }: MsGroupedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (chartState.status === 'loading' || chartState.status === 'idle') {
    return <MsBarChartSkeleton />
  }

  if (chartState.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-destructive">Error al cargar la producción por MS</p>
      </div>
    )
  }

  if (chartState.data.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<BarChart2 className="h-8 w-8 opacity-40" />}
          title="Sin producción registrada para los filtros aplicados"
        />
      </div>
    )
  }

  const msCount = chartState.data.length
  const chartWidth = Math.max(msCount * 120, containerWidth)

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Producción por MS: moneda extranjera vs nacional convertida"
      className="overflow-x-auto rounded-xl border bg-card p-4"
    >
      <BarChart
        width={chartWidth}
        height={320}
        data={chartState.data}
        margin={{ top: 8, right: 24, bottom: 60, left: 48 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="fullName"
          tick={{ fontSize: 11, fill: '#64748b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={(v: number) => formatUsdCompact(v)}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip content={<MsBarTooltip trmRate={trmRate} />} />
        <Legend
          verticalAlign="top"
          wrapperStyle={{ paddingBottom: 12 }}
          formatter={(value: string) => {
            if (value === 'foreignUsd') return 'Moneda extranjera (USD)'
            return trmRate !== null
              ? 'Nacional (COP → USD)'
              : 'Nacional (COP → USD) — TRM no disponible'
          }}
        />
        {/* fill on <Bar> drives the legend icon; <Cell> drives each individual bar */}
        <Bar dataKey="foreignUsd" name="foreignUsd" fill="#3b82f6" radius={[3, 3, 0, 0]}>
          {chartState.data.map((_, i) => (
            <Cell key={i} fill="#3b82f6" />
          ))}
        </Bar>
        <Bar
          dataKey="nationalUsdDisplay"
          name="nationalUsdDisplay"
          fill={trmRate !== null ? '#22c55e' : '#94a3b8'}
          radius={[3, 3, 0, 0]}
        >
          {chartState.data.map((entry, i) => (
            <Cell key={i} fill={entry.nationalUsd !== null ? '#22c55e' : '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </div>
  )
}
