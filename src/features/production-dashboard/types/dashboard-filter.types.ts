/**
 * Types for the Dashboard Filter Panel feature.
 * All identifiers in English; user-facing strings are in Spanish in the UI layer.
 */

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface DashboardFilterDraft {
  dateRange: { start: Date; end: Date }
  statuses: string[]
  categoryIds: number[]
  companyIds: number[]
  productIds: number[]
  originIds: number[]
  plazos: number[]
  periodicidades: string[]
  isInternacional: boolean
}

/** Applied snapshot — same shape as draft, committed after "Aplicar". */
export type DashboardAppliedFilters = DashboardFilterDraft

export interface DashboardFilterState {
  draft: DashboardFilterDraft
  applied: DashboardAppliedFilters
}

// ─── Active badges ────────────────────────────────────────────────────────────

export interface ActiveBadge {
  /** Unique key for React reconciliation */
  key: string
  /** Human-readable label shown in the badge */
  label: string
  /** Which filter field this badge represents */
  field: string
}

// ─── Reducer actions ──────────────────────────────────────────────────────────

export type FilterField =
  | 'statuses'
  | 'categoryIds'
  | 'companyIds'
  | 'productIds'
  | 'originIds'
  | 'plazos'
  | 'periodicidades'

export type DashboardFilterAction =
  | { type: 'SET_DATE_RANGE'; payload: { start: Date; end: Date } }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'TOGGLE_CATEGORY'; id: number }
  | { type: 'TOGGLE_COMPANY'; id: number; allProducts: ProductForCascade[] }
  | { type: 'TOGGLE_PRODUCT'; id: number }
  | { type: 'TOGGLE_ORIGIN'; id: number }
  | { type: 'SET_COMPANY_IDS'; ids: number[]; allProducts: ProductForCascade[] }
  | { type: 'SET_PRODUCT_IDS'; ids: number[] }
  | { type: 'SET_CATEGORY_IDS'; ids: number[] }
  | { type: 'SET_ORIGIN_IDS'; ids: number[] }
  | { type: 'SET_PLAZO'; payload: number }
  | { type: 'SET_PERIODICIDAD'; payload: string }
  | { type: 'SET_INTERNACIONAL'; value: boolean }
  | { type: 'SET_TODAS'; field: FilterField }
  | { type: 'APPLY' }
  | { type: 'CLEAR' }

// ─── Minimal product shape required for cascade logic ─────────────────────────

export interface ProductForCascade {
  readonly idProduct: number
  readonly idCompany: number
}
