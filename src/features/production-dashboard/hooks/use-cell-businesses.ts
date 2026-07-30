'use client'

import { useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessListResponse } from '@/features/negocios/types/business-api.types'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'
import { toBusinessListQueryParams } from '../lib/to-business-list-query-params'
import type { DashboardAppliedFilters } from '../types/dashboard-filter.types'
import type { CellBusinessList, CellBusinessRowView } from '../types/heatmap-cell-expansion.types'

/** Bounded page loop — hard cap so one cell can never issue unbounded requests. */
const MAX_PAGES = 5

export interface UseCellBusinessesInput {
  readonly idUser: number
  readonly idCompany: number
  readonly appliedFilters: DashboardAppliedFilters
  readonly periodicityIdByName: ReadonlyMap<string, number>
}

function toRowView(business: BusinessEntity): CellBusinessRowView {
  return {
    idBusiness: business.id,
    companyName: business.product.companyName,
    productName: business.product.name,
    contract: business.contract,
    value: business.value,
    currencyName: business.currency.name,
    status: business.status,
  }
}

async function fetchPage(
  input: UseCellBusinessesInput,
  page: number
): Promise<BusinessListResponse> {
  const params = toBusinessListQueryParams({
    filters: input.appliedFilters,
    idUser: input.idUser,
    idCompany: input.idCompany,
    periodicityIdByName: input.periodicityIdByName,
    page,
  })

  const response = await fetch(`/api/negocios?${params.toString()}`, {
    credentials: 'include',
  })

  const body = (await response.json()) as ApiResponse<BusinessListResponse>

  if (!response.ok || body.data === null) {
    const error = 'error' in body ? body.error : 'Error al obtener negocios de la celda'
    throw new Error(error || 'Error al obtener negocios de la celda')
  }

  return body.data
}

/**
 * Lazily fetches all businesses behind one heatmap cell (idUser × idCompany)
 * under the active dashboard filters, using a bounded page loop
 * (pageSize=100, MAX_PAGES=5 → 500 businesses/cell hard cap).
 *
 * Re-fetches whenever appliedFilters, idUser, or idCompany change; does not
 * manage expansion/collapse state — that lives in the caller.
 */
export function useCellBusinesses(input: UseCellBusinessesInput): AsyncState<CellBusinessList> {
  const { idUser, idCompany, appliedFilters, periodicityIdByName } = input
  const [state, setState] = useState<AsyncState<CellBusinessList>>({
    status: 'loading',
    data: undefined,
    error: '',
  })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: undefined, error: '' })

    async function fetchAll() {
      try {
        const firstPage = await fetchPage(input, 1)
        if (cancelled) return

        const { pagination } = firstPage
        let businesses: CellBusinessRowView[] = firstPage.businesses.map(toRowView)
        const lastPage = Math.min(pagination.totalPages, MAX_PAGES)

        for (let page = 2; page <= lastPage; page++) {
          const nextPage = await fetchPage(input, page)
          if (cancelled) return
          businesses = businesses.concat(nextPage.businesses.map(toRowView))
        }

        if (cancelled) return

        setState({
          status: 'success',
          data: {
            businesses,
            total: pagination.total,
            isTruncated: pagination.totalPages > MAX_PAGES,
          },
          error: '',
        })
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            data: undefined,
            error: error instanceof Error ? error.message : 'Error al obtener negocios de la celda',
          })
        }
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
    // periodicityIdByName is derived data (a Map), compared by identity is fine
    // since callers memoize/build it once per catalogs fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUser, idCompany, appliedFilters, periodicityIdByName])

  return state
}
