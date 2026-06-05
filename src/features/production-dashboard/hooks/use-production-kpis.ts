'use client'

import { useState, useEffect, useRef } from 'react'
import { useHierarchySelection } from '../components/HierarchySelectionContext'
import { useDashboardFilter } from '../components/DashboardFilterContext'
import type { ProductionKpiRaw, ProductionKpiComputed } from '../types/production-kpi.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

interface UseProductionKpisResult {
  isLoading: boolean
  isError: boolean
  computed: ProductionKpiComputed | null
}

const ZERO_RAW: ProductionKpiRaw = {
  totalCop: 0,
  totalForeignUsd: 0,
  nationalCount: 0,
  foreignCount: 0,
}

function computeKpis(raw: ProductionKpiRaw, trmRate: number): ProductionKpiComputed {
  const nationalUsd = trmRate > 0 ? raw.totalCop / trmRate : 0
  const totalUsd = nationalUsd + raw.totalForeignUsd
  return {
    detaileForeignUsd: raw.totalForeignUsd,
    nationalUsd,
    totalUsd,
    nationalCount: raw.nationalCount,
    foreignCount: raw.foreignCount,
    totalCount: raw.nationalCount + raw.foreignCount,
    totalCop: raw.totalCop,
  }
}

/**
 * Fetches production KPI aggregation from /api/production-dashboard/kpis.
 * Re-fetches when selectedUserIds or appliedFilters changes.
 * Does NOT re-fetch on trmRate change — conversion is client-side.
 * Short-circuits to zeros when selectedUserIds is empty (no fetch).
 */
export function useProductionKpis(trmRate: number): UseProductionKpisResult {
  const { selectedUserIds } = useHierarchySelection()
  const { appliedFilters } = useDashboardFilter()

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [raw, setRaw] = useState<ProductionKpiRaw | null>(null)

  // Stable reference for trmRate to avoid triggering re-fetches
  const trmRateRef = useRef(trmRate)
  trmRateRef.current = trmRate

  useEffect(() => {
    if (selectedUserIds.length === 0) {
      setRaw(ZERO_RAW)
      setIsLoading(false)
      setIsError(false)
      return
    }

    // Set loading synchronously so React guarantees a loading render before the fetch starts
    setIsLoading(true)
    setIsError(false)

    let cancelled = false

    async function fetchKpis() {
      try {
        const params = new URLSearchParams({
          userIds: selectedUserIds.join(','),
        })

        const { dateRange, statuses, categoryIds, productIds, companyIds, originIds, plazos, periodicidades } = appliedFilters

        if (dateRange.start) params.set('dateFrom', dateRange.start.toISOString().slice(0, 10))
        if (dateRange.end) params.set('dateTo', dateRange.end.toISOString().slice(0, 10))
        if (statuses.length > 0) params.set('statuses', statuses.join(','))
        if (categoryIds.length > 0) params.set('categoryIds', categoryIds.join(','))
        if (productIds.length > 0) params.set('productIds', productIds.join(','))
        if (companyIds.length > 0) params.set('companyIds', companyIds.join(','))
        if (originIds.length > 0) params.set('originIds', originIds.join(','))
        if (plazos.length > 0) params.set('plazos', plazos.join(','))
        if (periodicidades.length > 0) params.set('periodicidades', periodicidades.join(','))

        const response = await fetch(`/api/production-dashboard/kpis?${params.toString()}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (cancelled) return

        if (!response.ok) {
          setIsError(true)
          setIsLoading(false)
          return
        }

        const body = (await response.json()) as ApiResponse<ProductionKpiRaw>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setIsError(true)
          setIsLoading(false)
          return
        }

        setRaw(body.data)
        setIsLoading(false)
      } catch {
        if (!cancelled) {
          setIsError(true)
          setIsLoading(false)
        }
      }
    }

    fetchKpis()
    return () => {
      cancelled = true
    }
    // Intentionally NOT including trmRate — conversion is client-side (CAP-4)
  }, [selectedUserIds, appliedFilters])

  const computed = raw !== null ? computeKpis(raw, trmRate) : null

  return { isLoading, isError, computed }
}
