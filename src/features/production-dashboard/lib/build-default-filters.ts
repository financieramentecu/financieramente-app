import { startOfMonth, endOfMonth } from 'date-fns'
import type { DashboardFilterDraft } from '../types/dashboard-filter.types'

/**
 * Returns the default filter state for the dashboard filter panel.
 * Date range: first day to last day of the current month.
 * All multiselect arrays are empty (semantics: "all selected").
 */
export function buildDefaultFilters(): DashboardFilterDraft {
  const today = new Date()

  return {
    dateRange: {
      start: startOfMonth(today),
      end: endOfMonth(today),
    },
    statuses: [],
    categoryIds: [],
    companyIds: [],
    productIds: [],
    originIds: [],
    plazos: [],
    periodicidades: [],
    isInternacional: false,
  }
}
