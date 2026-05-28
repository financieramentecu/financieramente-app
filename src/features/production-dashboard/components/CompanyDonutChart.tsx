'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { EmptyState } from '@/features/shared/ui/empty-state'
import { CompanyDonutTooltip } from './CompanyDonutTooltip'
import { CompanyDonutLegend } from './CompanyDonutLegend'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { CompanyDonutSlice } from '../types/production-kpi.types'

interface CompanyDonutChartProps {
  readonly chartState: AsyncState<CompanyDonutSlice[]>
  readonly trmRate: number | null
}

/** Internal skeleton shown during loading or idle state. */
function CompanyDonutSkeleton() {
  return (
    <div aria-busy="true" className="rounded-xl border bg-card p-4 flex flex-col items-center gap-4">
      <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      <div className="relative flex items-center justify-center" style={{ height: 220 }}>
        {/* Outer ring skeleton */}
        <div className="absolute rounded-full animate-pulse bg-slate-200" style={{ width: 220, height: 220 }} />
        {/* Inner hole */}
        <div className="absolute rounded-full bg-card" style={{ width: 120, height: 120 }} />
      </div>
      {/* Legend skeleton */}
      <div className="w-full space-y-2 mt-2">
        {[80, 60, 50].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-sm bg-slate-200" />
            <div className={`h-3 animate-pulse rounded bg-slate-200`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Pure renderer for the Company Donut chart.
 * Does not call any hooks for data fetching — receives chartState as prop.
 * Requires 'use client' because Recharts uses browser APIs.
 *
 * Branches:
 * 1. idle | loading → skeleton
 * 2. error → error card
 * 3. success + empty → neutral empty state
 * 4. success + data → Recharts PieChart donut + custom legend
 */
export function CompanyDonutChart({ chartState, trmRate }: CompanyDonutChartProps) {
  if (chartState.status === 'loading' || chartState.status === 'idle') {
    return <CompanyDonutSkeleton />
  }

  if (chartState.status === 'error') {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-destructive">Error al cargar la distribución por compañía</p>
      </div>
    )
  }

  if (chartState.data.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={<PieChartIcon className="h-8 w-8 opacity-40" />}
          title="Sin negocios para los filtros aplicados"
        />
      </div>
    )
  }

  const slices = chartState.data

  return (
    <div
      role="img"
      aria-label="Distribución de negocios por compañía"
      className="rounded-xl border bg-card p-4"
    >
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
          >
            {slices.map((slice) => (
              <Cell
                key={`${slice.companyId}-${slice.currencyId}`}
                fill={slice.fill}
              />
            ))}
          </Pie>
          <Tooltip content={<CompanyDonutTooltip trmRate={trmRate} />} />
        </PieChart>
      </ResponsiveContainer>
      <CompanyDonutLegend slices={slices} />
    </div>
  )
}
