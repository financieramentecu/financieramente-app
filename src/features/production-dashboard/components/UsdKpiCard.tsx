'use client'

import type React from 'react'

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
  const cardStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.10)' }

  if (isLoading) {
    return (
      <div
        data-testid="kpi-skeleton"
        className="flex flex-col gap-1.5 rounded-xl p-3"
        style={cardStyle}
      >
        <div className="h-2.5 w-20 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <div className="h-6 w-32 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <div className="h-2.5 w-14 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <div className="h-4 w-28 animate-pulse rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl p-3" style={cardStyle}>
      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</p>
      {valueUsd === null ? (
        <p className="text-xl font-bold text-white">—</p>
      ) : (
        <>
          <p className="text-xl font-bold tabular-nums text-white">{formatUsd(valueUsd)}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{count} {count === 1 ? 'negocio' : 'negocios'}</p>
          {copAmount !== undefined && (
            <p className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.80)' }}>
              ≈ {formatCop(copAmount)}
            </p>
          )}
          {legend && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{legend}</p>
          )}
        </>
      )}
    </div>
  )
}
