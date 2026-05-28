'use client'

interface UsdKpiCardProps {
  label: string
  /** null when TRM is unavailable (conversion-dependent cards) */
  valueUsd: number | null
  count: number
  isLoading: boolean
  legend?: string
  /** COP source amount shown as a secondary comparison metric (Nacional card) */
  copAmount?: number
}

/** Format USD value as "USD 2,500.00" */
function formatUsd(value: number): string {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `USD ${formatted}`
}

/** Format COP value as "COP $8,100,000" */
function formatCop(value: number): string {
  return `COP $${value.toLocaleString('es-CO')}`
}

/**
 * Displays a single USD KPI metric card.
 * Shows "—" when valueUsd is null (TRM not available).
 */
export function UsdKpiCard({ label, valueUsd, count, isLoading, legend, copAmount }: UsdKpiCardProps) {
  if (isLoading) {
    return (
      <div
        data-testid="kpi-skeleton"
        className="flex flex-col gap-1.5 rounded-xl border border-l-4 border-l-green-500 bg-card p-3 shadow-sm"
      >
        <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-2.5 w-14 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-l-4 border-l-green-500 bg-card p-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {valueUsd === null ? (
        <p className="text-xl font-bold text-foreground">—</p>
      ) : (
        <>
          <p className="text-xl font-bold tabular-nums text-green-700">{formatUsd(valueUsd)}</p>
          <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'negocio' : 'negocios'}</p>
          {copAmount !== undefined && (
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-600">
              ≈ {formatCop(copAmount)}
            </p>
          )}
          {legend && (
            <p className="text-xs text-muted-foreground/80">{legend}</p>
          )}
        </>
      )}
    </div>
  )
}
