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

export type {
  TrmState,
  TrmDisplayData,
  TrmResponse,
} from './types/trm.types'

export type {
  ProductionKpiRaw,
  ProductionKpiComputed,
  UsdKpiCardData,
  ProductionKpiQueryParams,
} from './types/production-kpi.types'

// Filter context
export {
  DashboardFilterProvider,
  DashboardFilterContext,
  useDashboardFilter,
  dashboardFilterReducer,
  buildInitialState,
} from './components/DashboardFilterContext'

// Hooks
export { useTrm } from './hooks/use-trm'
export { useProductionKpis } from './hooks/use-production-kpis'

// Components
export { UsdKpiPanel } from './components/UsdKpiPanel'
export { UsdKpiCard } from './components/UsdKpiCard'
export { TrmDisplay } from './components/TrmDisplay'

// Lib
export { buildDefaultFilters } from './lib/build-default-filters'
export { isDateRangeValid } from './lib/validate-date-range'
export { deriveActiveProductIds } from './lib/derive-active-product-ids'
export { toggleItem } from './lib/toggle-todas'
export { formatPeriodLabel } from './lib/format-period-label'
export { getActiveBadges } from './lib/derive-active-badges'
export { isDraftEqualToApplied } from './lib/is-draft-equal-to-applied'

// MS Bar Chart
export { MsGroupedBarChart } from './components/MsGroupedBarChart'
export { useMsBarChart, collectNodesInOrder } from './hooks/use-ms-bar-chart'
export type { MsKpiRaw, MsBarDatum, MsChartQueryParams } from './types/production-kpi.types'

// Heatmap Table
export { HeatmapTablePanel } from './components/HeatmapTablePanel'
export { useHeatmapTable } from './hooks/use-heatmap-table'
export type {
  HeatmapRaw,
  HeatmapQueryParams,
  PersonRow,
  CompanyColumn,
  CategoryLegendItem,
  HeatmapViewModel,
} from './types/production-kpi.types'
