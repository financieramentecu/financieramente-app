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

    async function fetchCatalogs() {
      try {
        const response = await apiClient.get<ApiResponse<DashboardCatalogsResponse>>(
          '/production-dashboard/catalogs'
        )

        if (cancelled) return

        if (response.data) {
          setState({
            status: 'success',
            data: {
              companies: response.data.companies,
              products: response.data.products,
              origins: response.data.origins,
              categories: response.data.categories,
              periodicidades: response.data.periodicidades,
            },
            error: '',
          })
        } else {
          setState({ status: 'error', data: undefined, error: 'Failed to load catalogs' })
        }
      } catch {
        if (!cancelled) setState({ status: 'error', data: undefined, error: 'Failed to load catalogs' })
      }
    }

    fetchCatalogs()
    return () => { cancelled = true }
  }, [])

  return state
}
