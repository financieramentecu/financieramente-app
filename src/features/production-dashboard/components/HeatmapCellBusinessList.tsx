'use client'

import { useState } from 'react'
import { useCellBusinesses } from '../hooks/use-cell-businesses'
import { HeatmapCellBusinessRow } from './HeatmapCellBusinessRow'
import type { DashboardAppliedFilters } from '../types/dashboard-filter.types'

const REVEAL_STEP = 20

interface HeatmapCellBusinessListProps {
  readonly idUser: number
  readonly idCompany: number
  readonly appliedFilters: DashboardAppliedFilters
  readonly periodicityIdByName: ReadonlyMap<string, number>
}

const numFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Detail section rendered inside the heatmap's expanded `<tr colSpan>` row.
 * Lazily fetches the cell's businesses (via useCellBusinesses) and shows a
 * progressive-reveal list (20 rows at a time) with no internal scroll
 * container — the page's main scroll grows instead (CA4).
 */
export function HeatmapCellBusinessList({
  idUser,
  idCompany,
  appliedFilters,
  periodicityIdByName,
}: HeatmapCellBusinessListProps) {
  const state = useCellBusinesses({ idUser, idCompany, appliedFilters, periodicityIdByName })
  const [visibleCount, setVisibleCount] = useState(REVEAL_STEP)

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div role="status" aria-label="Cargando negocios" className="px-3 py-4 text-xs text-muted-foreground">
        Cargando negocios…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="px-3 py-4 text-xs text-destructive">
        {state.error}
      </div>
    )
  }

  const { businesses, total, isTruncated } = state.data

  if (businesses.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        Sin negocios para esta celda con los filtros actuales.
      </div>
    )
  }

  const visibleBusinesses = businesses.slice(0, visibleCount)
  const hasMore = visibleCount < businesses.length

  return (
    <div className="px-3 py-3">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-2 py-1.5 font-medium">Producto</th>
            <th className="px-2 py-1.5 font-medium">Contrato</th>
            <th className="px-2 py-1.5 text-right font-medium">Valor</th>
            <th className="px-2 py-1.5 font-medium">Estado</th>
            <th className="px-2 py-1.5 text-right font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {visibleBusinesses.map((business) => (
            <HeatmapCellBusinessRow key={business.idBusiness} business={business} />
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + REVEAL_STEP)}
            className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40"
          >
            Ver más ({businesses.length - visibleCount} restantes)
          </button>
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {numFormatter.format(businesses.length)} de {numFormatter.format(total)} negocios
        {isTruncated && ' — lista truncada a 500 negocios; refiná los filtros para ver el resto'}
      </p>
    </div>
  )
}
