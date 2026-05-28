/**
 * Types for the production KPI aggregation feature.
 */

import type { DashboardAppliedFilters } from './dashboard-filter.types'

// ─── Query params ─────────────────────────────────────────────────────────────

/** Parameters forwarded to the KPI service to scope the DB query */
export interface ProductionKpiQueryParams {
  userIds: number[]
  appliedFilters: DashboardAppliedFilters
}

// ─── Raw DB result ────────────────────────────────────────────────────────────

/** Shape returned by the Prisma groupBy + currency-classifier step */
export interface ProductionKpiRaw {
  /** Sum of COP (national) business values */
  totalCop: number
  /** Sum of foreign-currency (USD) business values */
  totalForeignUsd: number
  /** Count of national (COP) businesses */
  nationalCount: number
  /** Count of foreign-currency businesses */
  foreignCount: number
}

// ─── Computed (client-side conversion) ────────────────────────────────────────

/** Computed shape after applying the TRM conversion client-side */
export interface ProductionKpiComputed {
  /** Sum of foreign business values in USD (no conversion needed) */
  detaileForeignUsd: number
  /** COP total converted to USD: totalCop / trm */
  nationalUsd: number
  /** Combined total: nationalUsd + detaileForeignUsd */
  totalUsd: number
  /** National (COP) business count */
  nationalCount: number
  /** Foreign-currency business count */
  foreignCount: number
  /** Combined count */
  totalCount: number
  /** Original COP amount (for legend traceability) */
  totalCop: number
}

// ─── Card display data ────────────────────────────────────────────────────────

/** Shape for a single USD KPI card */
export interface UsdKpiCardData {
  label: string
  /** null when TRM is unavailable (applicable only to conversion-dependent cards) */
  valueUsd: number | null
  count: number
  /** Optional legend line shown below the value */
  legend?: string
}

// ─── MS Bar Chart types ────────────────────────────────────────────────────────

/**
 * One row of the per-user, per-currency groupBy result from getMsChartRaw().
 * At most N × 2 rows where N = number of selected users.
 */
export interface MsKpiRaw {
  readonly userId: number
  /**
   * Currency type identifier.
   * 1 = COP (national); any other value = foreign currency (USD-denominated).
   */
  readonly currencyType: number
  /** Raw sum of Business.value in native currency (COP or USD). NOT converted. */
  readonly totalAmount: number
  readonly count: number
}

/**
 * Client-side computed shape for one MS agent's bar group.
 * Produced by useMsBarChart after joining MsKpiRaw[] with hierarchy nodes
 * and applying TRM conversion.
 */
export interface MsBarDatum {
  readonly userId: number
  /** Display name from HierarchyNode — NOT from API data */
  readonly fullName: string
  readonly levelCode: string
  /** Foreign-currency total already in USD (no conversion) */
  readonly foreignUsd: number
  /**
   * National COP total converted to USD: Math.round((totalCop / trmRate) * 100) / 100.
   * null when trmRate is null (TRM unavailable).
   */
  readonly nationalUsd: number | null
  /**
   * Chart-safe display value: nationalUsd ?? 0.
   * Used as Recharts dataKey so the bar renders at zero height (gray) when TRM is null.
   */
  readonly nationalUsdDisplay: number
  /** Raw COP amount kept for tooltip display */
  readonly totalCop: number
  readonly foreignCount: number
  readonly nationalCount: number
}

/**
 * Query parameter contract for GET /api/production-dashboard/ms-chart.
 * Mirrors ProductionKpiQueryParams for filter parity with /kpis.
 */
export interface MsChartQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}
