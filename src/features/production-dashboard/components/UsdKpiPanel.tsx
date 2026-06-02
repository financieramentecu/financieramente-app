'use client'

import { useProductionKpis } from '../hooks/use-production-kpis'
import { useDashboardFilter } from './DashboardFilterContext'
import { formatPeriodLabel } from '../lib/format-period-label'
import { TrmDisplay } from './TrmDisplay'
import { UsdKpiCard } from './UsdKpiCard'
import type { TrmState } from '../types/trm.types'

interface UsdKpiPanelProps {
  readonly isLoading: boolean
  readonly trmRate: number | null
  readonly trmState: TrmState
  readonly isManual: boolean
  readonly error: string
  readonly setManualTrm: (rate: number) => void
}

/**
 * Composed panel showing the TRM display and three USD KPI cards.
 * Reads selectedUserIds and appliedFilters from their respective contexts.
 * TRM values are received as props (lifted to ShellContent in DashboardShell).
 */
export function UsdKpiPanel(props: UsdKpiPanelProps) {
  const { isLoading: trmLoading, trmRate, trmState, error, setManualTrm } = props
  const { appliedFilters } = useDashboardFilter()

  const effectiveTrmRate = trmRate ?? 0
  const { isLoading: kpiLoading, computed } = useProductionKpis(effectiveTrmRate)

  const isLoading = trmLoading || kpiLoading

  // When TRM is unavailable, nacional and total cannot be converted
  const trmAvailable = trmRate !== null

  const nacCopAmount = trmAvailable && computed ? computed.totalCop : undefined

  return (
    <section className="rounded-xl p-3 shadow-md" style={{ backgroundColor: '#003c45' }}>
      {/* Header: title left · TRM badge right */}
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">VENTA TOTAL</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {formatPeriodLabel(appliedFilters.dateRange.start, appliedFilters.dateRange.end)}
          </p>
        </div>
        <TrmDisplay
          compact
          trmState={trmState}
          trmRate={trmRate}
          isLoading={trmLoading}
          error={error}
          onManualTrm={setManualTrm}
        />
      </div>

      {/* Error block — shown below header only when TRM fetch failed */}
      {trmState === 'error' && !trmLoading && (
        <div className="mb-2">
          <TrmDisplay
            trmState={trmState}
            trmRate={trmRate}
            isLoading={false}
            error={error}
            onManualTrm={setManualTrm}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Detalle internacional — always shows value, no TRM needed */}
        <UsdKpiCard
          label="Venta en moneda extranjera"
          valueUsd={computed?.detaileForeignUsd ?? 0}
          count={computed?.foreignCount ?? 0}
          isLoading={isLoading}
        />

        {/* Nacional convertido a USD — null until TRM available */}
        <UsdKpiCard
          label="Venta en moneda local COP (Convertido a USD)"
          valueUsd={trmAvailable ? (computed?.nationalUsd ?? 0) : null}
          count={computed?.nationalCount ?? 0}
          isLoading={isLoading}
          copAmount={nacCopAmount}
        />

        {/* Total USD — null until TRM available */}
        <UsdKpiCard
          label="Total USD"
          valueUsd={trmAvailable ? (computed?.totalUsd ?? 0) : null}
          count={computed?.totalCount ?? 0}
          isLoading={isLoading}
        />
      </div>
    </section>
  )
}
