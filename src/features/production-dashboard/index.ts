// Production Dashboard — public API barrel export

// Types
export type {
  DashboardFilterDraft,
  DashboardAppliedFilters,
  DashboardFilterState,
  DashboardFilterAction,
  ActiveBadge,
  FilterField,
  ProductForCascade,
} from './types/dashboard-filter.types'

// Filter context
export {
  DashboardFilterProvider,
  DashboardFilterContext,
  useDashboardFilter,
  dashboardFilterReducer,
  buildInitialState,
} from './components/DashboardFilterContext'

// Lib
export { buildDefaultFilters } from './lib/build-default-filters'
export { isDateRangeValid } from './lib/validate-date-range'
export { deriveActiveProductIds } from './lib/derive-active-product-ids'
export { toggleItem } from './lib/toggle-todas'
export { formatPeriodLabel } from './lib/format-period-label'
export { getActiveBadges } from './lib/derive-active-badges'
export { isDraftEqualToApplied } from './lib/is-draft-equal-to-applied'
