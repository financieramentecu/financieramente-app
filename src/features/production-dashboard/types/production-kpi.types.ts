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

// ─── Heatmap types ─────────────────────────────────────────────────────────────

/**
 * Raw service result for one user: aggregated per-company COP totals.
 * Produced by getHeatmapRaw() — no TRM conversion applied.
 */
export interface HeatmapRaw {
  readonly idUser: number
  readonly fullName: string
  readonly levelCode: string
  /** Integer rank derived from Level.idNextLevel chain. Orphan nodes get 0. */
  readonly levelOrder: number
  readonly levelColor: string
  readonly categoryName: string
  readonly idCategory: number | null
  readonly cells: ReadonlyArray<{
    readonly idCompany: number
    readonly companyName: string
    /** Sum of Business.value for local-currency (COP) businesses. NOT converted. */
    readonly copTotal: number
    /** Sum of Business.value for foreign-currency businesses (already in USD). */
    readonly foreignUsdTotal: number
    readonly count: number
  }>
}

/**
 * Query parameter contract for GET /api/production-dashboard/heatmap.
 * Note: isInternacional is intentionally excluded — it MUST NOT be forwarded.
 */
export interface HeatmapQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}

/**
 * Client-side computed row for one user in the heatmap table.
 * COP values have been converted to USD by the hook using trmRate.
 */
export interface PersonRow {
  readonly idUser: number
  readonly fullName: string
  readonly levelCode: string
  readonly levelOrder: number
  readonly levelColor: string
  readonly categoryName: string
  /** Keyed by idCompany. usdTotal = copTotal/trm + foreignUsdTotal. copTotal kept for COP sub-line display. */
  readonly cellsByCompany: ReadonlyMap<number, { readonly usdTotal: number; readonly copTotal: number; readonly count: number }>
}

/**
 * One column in the heatmap table, representing a company.
 * totalUsd: sum of all visible rows' USD for this company.
 * maxUsd: highest individual row USD for this company (used for intensity normalization).
 */
export interface CompanyColumn {
  readonly idCompany: number
  readonly companyName: string
  readonly totalUsd: number
  readonly maxUsd: number
}

/** One entry in the category color legend shown in the panel header. */
export interface CategoryLegendItem {
  readonly categoryName: string
  readonly levelColor: string
}

/** Fully-pivoted view model consumed by HeatmapTablePanel. */
export interface HeatmapViewModel {
  readonly rows: ReadonlyArray<PersonRow>
  readonly companyColumns: ReadonlyArray<CompanyColumn>
  readonly legend: ReadonlyArray<CategoryLegendItem>
}

// ─── Company Donut Chart types ─────────────────────────────────────────────────

/**
 * Query parameter contract for GET /api/production-dashboard/by-company.
 * Mirrors OriginDonutQueryParams for filter parity.
 */
export interface CompanyDonutQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}

/**
 * One row from the service: (company × currency) aggregation.
 * No percentage or fill — those are computed client-side.
 */
export interface CompanyDonutRaw {
  readonly companyId: number
  readonly companyName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly currencySymbol: string
  readonly count: number
  /** Sum of Business.value for this (company × currency) segment */
  readonly totalValue: number
}

/**
 * Client-side computed slice ready for the chart.
 * Extends CompanyDonutRaw with percentage and color fill.
 */
export interface CompanyDonutSlice {
  readonly companyId: number
  readonly companyName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly currencySymbol: string
  readonly count: number
  /** Sum of Business.value for this (company × currency) segment */
  readonly totalValue: number
  /** 0–100, rounded to 1 decimal */
  readonly percentage: number
  /** Resolved hex fill from company-donut-colors (solid for non-COP) */
  readonly fill: string
  /** Resolved hex fill (light variant for COP) */
  readonly fillLight: string
}

// ─── Origin Donut Chart types ──────────────────────────────────────────────────

/**
 * Query parameter contract for GET /api/production-dashboard/by-origin.
 * Mirrors MsChartQueryParams for filter parity.
 */
export interface OriginDonutQueryParams {
  readonly userIds: readonly number[]
  readonly appliedFilters: DashboardAppliedFilters
}

/**
 * One row from the service: (origin × currency) aggregation.
 * No percentage or fill — those are computed client-side.
 */
export interface OriginDonutRaw {
  readonly originId: number
  readonly originName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly currencySymbol: string
  readonly count: number
  /** Sum of Business.value for this (origin × currency) segment */
  readonly totalValue: number
}

/**
 * Client-side computed slice ready for the chart.
 * Extends OriginDonutRaw with percentage and color fill.
 */
export interface OriginDonutSlice {
  readonly originId: number
  readonly originName: string
  readonly currencyId: number
  readonly currencyName: string
  readonly currencySymbol: string
  readonly count: number
  /** Sum of Business.value for this (origin × currency) segment */
  readonly totalValue: number
  /** 0–100, rounded to 1 decimal */
  readonly percentage: number
  /** Resolved hex fill from origin-donut-colors (solid for non-COP) */
  readonly fill: string
  /** Resolved hex fill (light variant for COP) */
  readonly fillLight: string
}
