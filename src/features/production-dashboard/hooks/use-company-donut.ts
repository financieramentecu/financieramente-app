'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useHierarchySelection } from '../components/HierarchySelectionContext'
import { useDashboardFilter } from '../components/DashboardFilterContext'
import { aggregateCompanyDonut } from '../lib/company-donut-aggregate'
import type { CompanyDonutRaw, CompanyDonutSlice } from '../types/production-kpi.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

type FetchStatus = 'idle' | 'loading' | 'error'

/**
 * Fetches company distribution data from /api/production-dashboard/by-company,
 * aggregates into CompanyDonutSlice[] and returns AsyncState<CompanyDonutSlice[]>.
 *
 * Mirrors the auth/hierarchy gating pattern from useOriginDonut:
 * - No hierarchy nodes → MS Junior path: uses session userId.
 * - Hierarchy nodes present → uses selectedUserIds.
 * - Re-fetches when selectedUserIds or appliedFilters changes.
 * - Uses cancelled flag + AbortController for race condition prevention (ADR-D5).
 *
 * No trmRate prop needed — company donut is count-based only.
 */
export function useCompanyDonut(): AsyncState<CompanyDonutSlice[]> {
  const { nodes, selectedUserIds } = useHierarchySelection()
  const { appliedFilters } = useDashboardFilter()
  const { data: session, status: sessionStatus } = useSession()

  const [rawData, setRawData] = useState<CompanyDonutRaw[] | null>(null)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [fetchError, setFetchError] = useState('')

  const selfUserId = session?.user?.id ? Number(session.user.id) : undefined

  useEffect(() => {
    // MS Junior path: no hierarchy nodes, use session userId
    if (nodes.length === 0) {
      if (sessionStatus === 'loading') {
        setFetchStatus('loading')
        return
      }
      if (!selfUserId) {
        setFetchError('No se pudo obtener el usuario de la sesión')
        setFetchStatus('error')
        return
      }
    }

    // If nodes exist but none are selected/included, short-circuit to empty success
    if (nodes.length > 0 && selectedUserIds.length === 0) {
      setRawData([])
      setFetchStatus('idle')
      return
    }

    // Build effective user IDs
    const effectiveUserIds: number[] =
      nodes.length === 0 && selfUserId !== undefined
        ? [selfUserId]
        : [...selectedUserIds]

    setFetchStatus('loading')
    setFetchError('')

    let cancelled = false
    const controller = new AbortController()

    async function fetchDonut() {
      try {
        const params = new URLSearchParams({
          userIds: effectiveUserIds.join(','),
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
        if (appliedFilters.hasSupports === true) params.set('hasSupports', 'true')
        else if (appliedFilters.hasSupports === false) params.set('hasSupports', 'false')

        const response = await fetch(
          `/api/production-dashboard/by-company?${params.toString()}`,
          { credentials: 'include', signal: controller.signal }
        )

        if (cancelled) return

        if (!response.ok) {
          setFetchError('Error al obtener distribución por compañía')
          setFetchStatus('error')
          return
        }

        const body = (await response.json()) as ApiResponse<CompanyDonutRaw[]>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setFetchError(
            (body as { data: null; error: string }).error ??
              'Error al obtener distribución por compañía'
          )
          setFetchStatus('error')
          return
        }

        setRawData(body.data)
        setFetchStatus('idle')
      } catch (err) {
        if (cancelled) return
        if ((err as Error).name === 'AbortError') return
        setFetchError('Error al obtener distribución por compañía')
        setFetchStatus('error')
      }
    }

    fetchDonut()
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserIds, appliedFilters, selfUserId])

  // Derive AsyncState from internal state pieces
  if (fetchStatus === 'loading') {
    return { status: 'loading', data: undefined, error: '' }
  }
  if (fetchStatus === 'error') {
    return { status: 'error', data: undefined, error: fetchError }
  }
  if (rawData === null) {
    return { status: 'idle', data: undefined, error: '' }
  }

  const data = aggregateCompanyDonut(rawData)
  return { status: 'success', data, error: '' }
}
