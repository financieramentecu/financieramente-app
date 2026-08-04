import type { DashboardAppliedFilters } from '../types/dashboard-filter.types'

/**
 * Parse a comma-separated string of integers.
 * Returns null on invalid input; empty string → [].
 */
export function parseIds(raw: string | null): number[] | null {
  if (raw === null) return null
  if (raw.trim() === '') return []
  const parts = raw.split(',').map((s) => s.trim())
  const ids = parts.map(Number)
  if (ids.some((n) => !Number.isInteger(n) || isNaN(n))) return null
  return ids
}

/**
 * Parse the three-state hasSupports query param.
 * `'true'` → true, `'false'` → false, anything else → undefined (Todos).
 */
export function parseHasSupports(raw: string | null): boolean | undefined {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

/**
 * Build DashboardAppliedFilters from URL search params for aggregation routes.
 * Shared by kpis, by-origin, by-company, by-status, ms-chart, and heatmap
 * to avoid encode/decode drift across endpoints.
 */
export function parseDashboardAppliedFilters(
  searchParams: URLSearchParams
): DashboardAppliedFilters {
  const rawStatuses = searchParams.get('statuses')
  const statuses = rawStatuses
    ? rawStatuses.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const rawPeriodicidades = searchParams.get('periodicidades')
  const periodicidades = rawPeriodicidades
    ? rawPeriodicidades.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const categoryIds = parseIds(searchParams.get('categoryIds')) ?? []
  const productIds = parseIds(searchParams.get('productIds')) ?? []
  const companyIds = parseIds(searchParams.get('companyIds')) ?? []
  const originIds = parseIds(searchParams.get('originIds')) ?? []
  const plazos = parseIds(searchParams.get('plazos')) ?? []
  const hasSupports = parseHasSupports(searchParams.get('hasSupports'))

  const rawDateFrom = searchParams.get('dateFrom')
  const rawDateTo = searchParams.get('dateTo')

  const dateRange = {
    start: rawDateFrom
      ? new Date(rawDateFrom)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: rawDateTo
      ? new Date(rawDateTo)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  }

  return {
    dateRange,
    statuses,
    categoryIds,
    companyIds,
    productIds,
    originIds,
    plazos,
    periodicidades,
    isInternacional: false,
    ...(hasSupports !== undefined ? { hasSupports } : {}),
  }
}
