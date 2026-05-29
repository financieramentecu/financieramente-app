import { startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import type { ActiveBadge, DashboardAppliedFilters } from '../types/dashboard-filter.types'
import { formatPeriodLabel } from './format-period-label'

export function getActiveBadges(applied: DashboardAppliedFilters): ActiveBadge[] {
  const badges: ActiveBadge[] = []
  const today = new Date()
  const defaultStart = startOfMonth(today)
  const defaultEnd = endOfMonth(today)

  const isDefaultDateRange =
    isSameDay(applied.dateRange.start, defaultStart) &&
    isSameDay(applied.dateRange.end, defaultEnd)

  if (!isDefaultDateRange) {
    badges.push({
      key: 'dateRange',
      label: `Periodo: ${formatPeriodLabel(applied.dateRange.start, applied.dateRange.end)}`,
      field: 'dateRange',
    })
  }

  if (applied.statuses.length > 0)
    badges.push({ key: 'statuses', label: `Estado: ${applied.statuses.join(', ')}`, field: 'statuses' })

  if (applied.categoryIds.length > 0)
    badges.push({ key: 'categoryIds', label: `Categorías: ${applied.categoryIds.length}`, field: 'categoryIds' })

  if (applied.companyIds.length > 0)
    badges.push({ key: 'companyIds', label: `Compañías: ${applied.companyIds.length}`, field: 'companyIds' })

  if (applied.productIds.length > 0)
    badges.push({ key: 'productIds', label: `Productos: ${applied.productIds.length}`, field: 'productIds' })

  if (applied.originIds.length > 0)
    badges.push({ key: 'originIds', label: `Orígenes: ${applied.originIds.length}`, field: 'originIds' })

  if (applied.plazos.length > 0)
    badges.push({ key: 'plazos', label: `Plazos: ${applied.plazos.join(', ')}`, field: 'plazos' })

  if (applied.periodicidades.length > 0)
    badges.push({ key: 'periodicidades', label: `Periodicidad: ${applied.periodicidades.join(', ')}`, field: 'periodicidades' })

  return badges
}
