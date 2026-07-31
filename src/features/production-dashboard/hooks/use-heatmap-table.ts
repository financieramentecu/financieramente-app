'use client'

import { useState, useEffect } from 'react'
import { useHierarchySelection } from '../components/HierarchySelectionContext'
import { useDashboardFilter } from '../components/DashboardFilterContext'
import type {
  HeatmapRaw,
  PersonRow,
  CompanyColumn,
  CategoryLegendItem,
  HeatmapViewModel,
} from '../types/production-kpi.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

// ─── Pure pivot helpers ───────────────────────────────────────────────────────

/**
 * Converts HeatmapRaw[] into PersonRow[] with USD conversion applied.
 * Rows are sorted: levelOrder desc (highest seniority first), then fullName asc.
 *
 * Pure function — exported for unit testing.
 */
export function pivotHeatmapRows(
  raw: HeatmapRaw[],
  trmRate: number
): PersonRow[] {
  const rows: PersonRow[] = raw.map((entry) => {
    const cellsByCompany = new Map<number, { usdTotal: number; copTotal: number; count: number }>()

    for (const cell of entry.cells) {
      const copConverted = trmRate > 0 ? cell.copTotal / trmRate : 0
      const usdTotal = Math.round((copConverted + cell.foreignUsdTotal) * 100) / 100
      const existing = cellsByCompany.get(cell.idCompany)
      if (existing) {
        existing.usdTotal += usdTotal
        existing.copTotal += cell.copTotal
        existing.count += cell.count
      } else {
        cellsByCompany.set(cell.idCompany, { usdTotal, copTotal: cell.copTotal, count: cell.count })
      }
    }

    return {
      idUser: entry.idUser,
      fullName: entry.fullName,
      levelCode: entry.levelCode,
      levelOrder: entry.levelOrder,
      levelColor: entry.levelColor,
      categoryName: entry.categoryName,
      cellsByCompany: cellsByCompany as ReadonlyMap<number, { usdTotal: number; copTotal: number; count: number }>,
    }
  })

  // Sort: levelOrder desc, fullName asc within same level
  return rows.sort((a, b) => {
    if (b.levelOrder !== a.levelOrder) return b.levelOrder - a.levelOrder
    return a.fullName.localeCompare(b.fullName)
  })
}

/**
 * Builds CompanyColumn[] from pivoted rows.
 * Computes totalUsd (sum across all rows) and maxUsd (highest individual row value).
 * Excludes companies where totalUsd === 0.
 * Sorts by totalUsd desc; alphabetical tiebreak.
 *
 * Pure function — exported for unit testing.
 */
export function buildCompanyColumns(rows: PersonRow[]): CompanyColumn[] {
  // Collect company names from all rows
  const companyMeta = new Map<number, string>()
  const totalsByCompany = new Map<number, number>()
  const maxByCompany = new Map<number, number>()

  for (const row of rows) {
    for (const [idCompany, cell] of row.cellsByCompany) {
      if (!companyMeta.has(idCompany)) {
        // We need the company name — it comes from HeatmapRaw, not PersonRow
        // We'll collect it separately in the hook
      }
      const currentTotal = totalsByCompany.get(idCompany) ?? 0
      totalsByCompany.set(idCompany, currentTotal + cell.usdTotal)

      const currentMax = maxByCompany.get(idCompany) ?? 0
      maxByCompany.set(idCompany, Math.max(currentMax, cell.usdTotal))
    }
  }

  return Array.from(totalsByCompany.entries())
    .filter(([, totalUsd]) => totalUsd > 0)
    .sort(([idA, totalA], [idB, totalB]) => {
      if (totalB !== totalA) return totalB - totalA
      // Alphabetical tiebreak — needs companyName
      const nameA = companyMeta.get(idA) ?? ''
      const nameB = companyMeta.get(idB) ?? ''
      return nameA.localeCompare(nameB)
    })
    .map(([idCompany, totalUsd]) => ({
      idCompany,
      companyName: companyMeta.get(idCompany) ?? '',
      totalUsd,
      maxUsd: maxByCompany.get(idCompany) ?? 0,
    }))
}

/**
 * Full pivot: converts HeatmapRaw[] + trmRate into HeatmapViewModel.
 * Handles company name collection in a single pass.
 */
function pivotToViewModel(raw: HeatmapRaw[], trmRate: number): HeatmapViewModel {
  // First collect company names (needed for column display)
  const companyNames = new Map<number, string>()
  for (const entry of raw) {
    for (const cell of entry.cells) {
      if (!companyNames.has(cell.idCompany)) {
        companyNames.set(cell.idCompany, cell.companyName)
      }
    }
  }

  const rows = pivotHeatmapRows(raw, trmRate)

  // Build company columns using company names
  const totalsByCompany = new Map<number, number>()
  const maxByCompany = new Map<number, number>()

  for (const row of rows) {
    for (const [idCompany, cell] of row.cellsByCompany) {
      const currentTotal = totalsByCompany.get(idCompany) ?? 0
      totalsByCompany.set(idCompany, currentTotal + cell.usdTotal)

      const currentMax = maxByCompany.get(idCompany) ?? 0
      maxByCompany.set(idCompany, Math.max(currentMax, cell.usdTotal))
    }
  }

  const companyColumns: CompanyColumn[] = Array.from(totalsByCompany.entries())
    .filter(([, totalUsd]) => totalUsd > 0)
    .sort(([idA, totalA], [idB, totalB]) => {
      if (totalB !== totalA) return totalB - totalA
      const nameA = companyNames.get(idA) ?? ''
      const nameB = companyNames.get(idB) ?? ''
      return nameA.localeCompare(nameB)
    })
    .map(([idCompany, totalUsd]) => ({
      idCompany,
      companyName: companyNames.get(idCompany) ?? '',
      totalUsd,
      maxUsd: maxByCompany.get(idCompany) ?? 0,
    }))

  // Build legend from visible rows (unique categoryName + levelColor)
  const legendMap = new Map<string, string>()
  for (const row of rows) {
    if (row.categoryName && !legendMap.has(row.categoryName)) {
      legendMap.set(row.categoryName, row.levelColor)
    }
  }
  const legend: CategoryLegendItem[] = Array.from(legendMap.entries()).map(
    ([categoryName, levelColor]) => ({ categoryName, levelColor })
  )

  return { rows, companyColumns, legend }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type FetchStatus = 'idle' | 'loading' | 'error'

/**
 * Fetches heatmap data and pivots it into a HeatmapViewModel.
 * Remains idle until trmRate is a non-null number.
 * Re-fetches when selectedUserIds or appliedFilters changes.
 * Does NOT re-fetch on trmRate change — conversion is client-side only.
 */
export function useHeatmapTable(trmRate: number | null): AsyncState<HeatmapViewModel> {
  const { selectedUserIds } = useHierarchySelection()
  const { appliedFilters } = useDashboardFilter()

  const [rawData, setRawData] = useState<HeatmapRaw[] | null>(null)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    // Remain idle while trmRate is null — no fetch triggered
    if (trmRate === null) {
      setFetchStatus('idle')
      setRawData(null)
      return
    }

    setFetchStatus('loading')
    setFetchError('')

    let cancelled = false

    async function fetchHeatmap() {
      try {
        const params = new URLSearchParams({
          userIds: [...selectedUserIds].join(','),
        })

        const {
          dateRange,
          statuses,
          categoryIds,
          productIds,
          companyIds,
          originIds,
          plazos,
          periodicidades,
          // isInternacional intentionally excluded
        } = appliedFilters

        if (dateRange.start) params.set('dateFrom', dateRange.start.toISOString().slice(0, 10))
        if (dateRange.end) params.set('dateTo', dateRange.end.toISOString().slice(0, 10))
        if (statuses.length > 0) params.set('statuses', statuses.join(','))
        if (categoryIds.length > 0) params.set('categoryIds', categoryIds.join(','))
        if (productIds.length > 0) params.set('productIds', productIds.join(','))
        if (companyIds.length > 0) params.set('companyIds', companyIds.join(','))
        if (originIds.length > 0) params.set('originIds', originIds.join(','))
        if (plazos.length > 0) params.set('plazos', plazos.join(','))
        if (periodicidades.length > 0) params.set('periodicidades', periodicidades.join(','))

        const response = await fetch(
          `/api/production-dashboard/heatmap?${params.toString()}`,
          { credentials: 'include' }
        )

        if (cancelled) return

        if (!response.ok) {
          setFetchError('Error al obtener datos del heatmap')
          setFetchStatus('error')
          return
        }

        const body = (await response.json()) as ApiResponse<HeatmapRaw[]>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setFetchError(
            (body as { data: null; error: string }).error ?? 'Error al obtener datos del heatmap'
          )
          setFetchStatus('error')
          return
        }

        setRawData(body.data)
        setFetchStatus('idle')
      } catch {
        if (!cancelled) {
          setFetchError('Error al obtener datos del heatmap')
          setFetchStatus('error')
        }
      }
    }

    fetchHeatmap()
    return () => {
      cancelled = true
    }
    // trmRate value excluded — TRM conversion is client-side only.
    // trmRate !== null is included to trigger the initial fetch once trmRate resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserIds, appliedFilters, trmRate !== null])

  // Handle null trmRate → remain idle
  if (trmRate === null) {
    return { status: 'idle', data: undefined, error: '' }
  }

  if (fetchStatus === 'loading') {
    return { status: 'loading', data: undefined, error: '' }
  }
  if (fetchStatus === 'error') {
    return { status: 'error', data: undefined, error: fetchError }
  }
  if (rawData === null) {
    return { status: 'idle', data: undefined, error: '' }
  }

  const data = pivotToViewModel(rawData, trmRate)
  return { status: 'success', data, error: '' }
}
