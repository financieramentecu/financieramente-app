'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
  DashboardCatalogItem,
  DashboardProductCatalogItem,
  DashboardCatalogsResponse,
} from '@/app/api/production-dashboard/catalogs/route'

export interface DashboardCatalogsData {
  companies: DashboardCatalogItem[]
  products: DashboardProductCatalogItem[]
  origins: DashboardCatalogItem[]
  categories: DashboardCatalogItem[]
  periodicidades: DashboardCatalogItem[]
}

let inFlightRequest: Promise<DashboardCatalogsData> | null = null

/**
 * One request shared by every consumer mounted at the same time (the filter
 * panel and the heatmap both need the catalogs). It is dropped as soon as it
 * settles, so a later mount always loads fresh data.
 */
function loadDashboardCatalogs(): Promise<DashboardCatalogsData> {
  if (inFlightRequest) return inFlightRequest

  const request = apiClient
    .get<ApiResponse<DashboardCatalogsResponse>>('/production-dashboard/catalogs')
    .then((response) => {
      if (!response.data) throw new Error('Failed to load catalogs')
      return {
        companies: response.data.companies,
        products: response.data.products,
        origins: response.data.origins,
        categories: response.data.categories,
        periodicidades: response.data.periodicidades,
      }
    })
    .finally(() => {
      if (inFlightRequest === request) inFlightRequest = null
    })

  inFlightRequest = request
  return request
}

/**
 * Fetches all active catalog items for dashboard filter dropdowns in a single request.
 * Uses a dedicated unpaginated endpoint — no truncation risk.
 */
export function useDashboardCatalogs(): AsyncState<DashboardCatalogsData> {
  const [state, setState] = useState<AsyncState<DashboardCatalogsData>>({
    status: 'loading',
    data: undefined,
    error: '',
  })

  useEffect(() => {
    let cancelled = false

    loadDashboardCatalogs()
      .then((data) => {
        if (!cancelled) setState({ status: 'success', data, error: '' })
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', data: undefined, error: 'Failed to load catalogs' })
        }
      })

    return () => { cancelled = true }
  }, [])

  return state
}
