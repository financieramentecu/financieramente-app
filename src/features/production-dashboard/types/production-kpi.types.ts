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
