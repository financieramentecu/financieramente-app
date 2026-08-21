import { bogotaDateOnly } from '@/features/negocios/lib/bogota-date'
import type { DashboardAppliedFilters } from '../types/dashboard-filter.types'

const CELL_BUSINESS_LIST_PAGE_SIZE = 100

export interface ToBusinessListQueryParamsInput {
  readonly filters: DashboardAppliedFilters
  readonly idUser: number
  readonly idCompany: number
  readonly periodicityIdByName: ReadonlyMap<string, number>
  readonly page: number
}

/**
 * Maps a heatmap cell (idUser, idCompany) + the dashboard's active filters
 * into the exact `GET /api/negocios` query params required for the expanded
 * cell business list to reconcile with the heatmap aggregate.
 *
 * Pure function — no fetch, no Prisma. See design.md Decision A for the
 * verified field-by-field equivalence with the heatmap WHERE clause.
 */
export function toBusinessListQueryParams(
  input: ToBusinessListQueryParamsInput
): URLSearchParams {
  const { filters, idUser, idCompany, periodicityIdByName, page } = input
  const params = new URLSearchParams()

  // Cell coordinates — the cell already scopes both advisor and company,
  // so the cell's own company always wins over filters.companyIds.
  params.append('agentIds', String(idUser))
  params.append('companyIds', String(idCompany))

  // Date range: createdFrom/createdTo (createdAt), never dateFrom/dateTo
  // (dateAnchored) — using the latter would break reconciliation with the
  // heatmap aggregate, which filters by createdAt.
  params.set('createdFrom', bogotaDateOnly(filters.dateRange.start))
  params.set('createdTo', bogotaDateOnly(filters.dateRange.end))

  for (const status of filters.statuses) {
    params.append('statuses', status)
  }

  for (const productId of filters.productIds) {
    params.append('productIds', String(productId))
  }

  for (const originId of filters.originIds) {
    params.append('originIds', String(originId))
  }

  for (const term of filters.plazos) {
    params.append('terms', String(term))
  }

  for (const categoryId of filters.categoryIds) {
    params.append('agentCategoryIds', String(categoryId))
  }

  for (const periodicidadName of filters.periodicidades) {
    const periodicityId = periodicityIdByName.get(periodicidadName)
    if (periodicityId !== undefined) {
      params.append('periodicityIds', String(periodicityId))
    }
  }

  // isInternacional is never forwarded — the heatmap aggregate ignores it too.

  if (filters.hasSupports === true) {
    params.set('hasSupports', 'true')
  } else if (filters.hasSupports === false) {
    params.set('hasSupports', 'false')
  }

  params.set('page', String(page))
  params.set('pageSize', String(CELL_BUSINESS_LIST_PAGE_SIZE))
  params.set('sortBy', 'createdAt')
  params.set('sortOrder', 'desc')

  return params
}
