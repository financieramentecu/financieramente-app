'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
  DashboardCatalogItem,
  DashboardProductCatalogItem,
  DashboardCatalogsResponse,
} from '@/app/api/production-dashboard/catalogs/route'

interface DashboardCatalogs {
  companies: DashboardCatalogItem[]
  products: DashboardProductCatalogItem[]
  origins: DashboardCatalogItem[]
  categories: DashboardCatalogItem[]
  periodicidades: DashboardCatalogItem[]
  isLoading: boolean
  isError: boolean
}

const EMPTY: DashboardCatalogs = {
  companies: [],
  products: [],
  origins: [],
  categories: [],
  periodicidades: [],
  isLoading: true,
  isError: false,
}

/**
 * Fetches all active catalog items for dashboard filter dropdowns in a single request.
 * Uses a dedicated unpaginated endpoint — no truncation risk.
 */
export function useDashboardCatalogs(): DashboardCatalogs {
  const [state, setState] = useState<DashboardCatalogs>(EMPTY)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setState((prev) => ({ ...prev, isLoading: true, isError: false }))
      try {
        const response = await apiClient.get<ApiResponse<DashboardCatalogsResponse>>(
          '/production-dashboard/catalogs'
        )

        if (cancelled) return

        if (response.data) {
          setState({
            companies: response.data.companies,
            products: response.data.products,
            origins: response.data.origins,
            categories: response.data.categories,
            periodicidades: response.data.periodicidades,
            isLoading: false,
            isError: false,
          })
        } else {
          setState((prev) => ({ ...prev, isLoading: false, isError: true }))
        }
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, isLoading: false, isError: true }))
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  return state
}
