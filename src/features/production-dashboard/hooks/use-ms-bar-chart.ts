'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useHierarchySelection } from '../components/HierarchySelectionContext'
import { useDashboardFilter } from '../components/DashboardFilterContext'
import type { HierarchyNode } from '../types/hierarchy.types'
import type { MsKpiRaw, MsBarDatum } from '../types/production-kpi.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

/**
 * Depth-first walk of the hierarchy tree.
 * Collects ALL included nodes (any levelCode — all roles can produce businesses).
 * The authenticated user's own node is placed FIRST in the result.
 *
 * Pure function — exported for unit testing.
 */
export function collectNodesInOrder(
  nodes: HierarchyNode[],
  selfUserId: number | undefined
): HierarchyNode[] {
  const result: HierarchyNode[] = []
  let selfNode: HierarchyNode | undefined

  function walk(ns: HierarchyNode[]): void {
    for (const node of ns) {
      if (node.included) {
        if (node.userId === selfUserId) {
          selfNode = node
        } else {
          result.push(node)
        }
      }
      walk(node.children)
    }
  }

  walk(nodes)
  return selfNode !== undefined ? [selfNode, ...result] : result
}

/** Internal helper: joins raw API data with ordered nodes and applies TRM conversion. */
function joinAndConvert(
  raw: MsKpiRaw[],
  orderedNodes: HierarchyNode[],
  trmRate: number | null
): MsBarDatum[] {
  const byUser = new Map<number, { cop?: MsKpiRaw; foreign?: MsKpiRaw }>()
  for (const row of raw) {
    const entry = byUser.get(row.userId) ?? {}
    if (row.currencyType === 1) {
      entry.cop = row
    } else {
      entry.foreign = row
    }
    byUser.set(row.userId, entry)
  }

  return orderedNodes
    .map((node) => {
      const entry = byUser.get(node.userId) ?? {}
      const totalCop = entry.cop?.totalAmount ?? 0
      const foreignUsd = entry.foreign?.totalAmount ?? 0
      const nationalUsd =
        trmRate !== null && trmRate > 0
          ? Math.round((totalCop / trmRate) * 100) / 100
          : null

      return {
        userId: node.userId,
        fullName: node.fullName,
        levelCode: node.levelCode,
        foreignUsd,
        nationalUsd,
        nationalUsdDisplay: nationalUsd ?? 0,
        totalCop,
        foreignCount: entry.foreign?.count ?? 0,
        nationalCount: entry.cop?.count ?? 0,
      }
    })
    .sort((a, b) => (b.foreignUsd + b.nationalUsdDisplay) - (a.foreignUsd + a.nationalUsdDisplay))
}

type FetchStatus = 'idle' | 'loading' | 'error'

/**
 * Fetches per-MS production data and applies TRM conversion client-side.
 * Returns AsyncState<MsBarDatum[]> ordered by hierarchy depth-first traversal.
 * Re-fetches when selectedUserIds or appliedFilters changes.
 * Does NOT re-fetch on trmRate change — conversion is client-side only.
 */
export function useMsBarChart(trmRate: number | null): AsyncState<MsBarDatum[]> {
  const { nodes, selectedUserIds } = useHierarchySelection()
  const { appliedFilters } = useDashboardFilter()
  const { data: session, status: sessionStatus } = useSession()

  const [rawData, setRawData] = useState<MsKpiRaw[] | null>(null)
  const [orderedNodes, setOrderedNodes] = useState<HierarchyNode[]>([])
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

    const orderedMs = collectNodesInOrder(nodes, selfUserId)

    // If nodes exist but none are selected/included, short-circuit to empty success
    if (nodes.length > 0 && orderedMs.length === 0) {
      setOrderedNodes([])
      setRawData([])
      setFetchStatus('idle')
      return
    }

    // For MS Junior (nodes.length === 0), build synthetic node
    let effectiveNodes: HierarchyNode[]
    if (nodes.length === 0 && selfUserId !== undefined) {
      const syntheticNode: HierarchyNode = {
        userId: selfUserId,
        fullName: session?.user?.name ?? `Usuario ${selfUserId}`,
        levelCode: 'MS_JUNIOR',
        levelColor: '',
        categoryName: '',
        idCategory: null,
        included: true,
        children: [],
      }
      effectiveNodes = [syntheticNode]
    } else {
      effectiveNodes = orderedMs
    }

    setOrderedNodes(effectiveNodes)
    setFetchStatus('loading')
    setFetchError('')

    const effectiveUserIds =
      nodes.length === 0 && selfUserId !== undefined
        ? [selfUserId]
        : selectedUserIds.filter((id) => orderedMs.some((n) => n.userId === id))

    let cancelled = false

    async function fetchChart() {
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

        const response = await fetch(
          `/api/production-dashboard/ms-chart?${params.toString()}`,
          { credentials: 'include' }
        )

        if (cancelled) return

        if (!response.ok) {
          setFetchError('Error al obtener datos de producción por MS')
          setFetchStatus('error')
          return
        }

        const body = (await response.json()) as ApiResponse<MsKpiRaw[]>

        if (cancelled) return

        if ('error' in body || body.data === null) {
          setFetchError(
            (body as { data: null; error: string }).error ??
              'Error al obtener datos de producción por MS'
          )
          setFetchStatus('error')
          return
        }

        setRawData(body.data)
        setFetchStatus('idle')
      } catch {
        if (!cancelled) {
          setFetchError('Error al obtener datos de producción por MS')
          setFetchStatus('error')
        }
      }
    }

    fetchChart()
    return () => {
      cancelled = true
    }
    // trmRate intentionally excluded — TRM conversion is client-side only
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

  const data = joinAndConvert(rawData, orderedNodes, trmRate)
  return { status: 'success', data, error: '' }
}
