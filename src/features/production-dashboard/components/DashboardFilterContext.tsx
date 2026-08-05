'use client'

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react'
import type {
  DashboardFilterAction,
  DashboardFilterState,
  DashboardFilterDraft,
  DashboardAppliedFilters,
  ActiveBadge,
  FilterField,
} from '../types/dashboard-filter.types'
import { buildDefaultFilters } from '../lib/build-default-filters'
import { deriveActiveProductIds } from '../lib/derive-active-product-ids'
import { toggleItem } from '../lib/toggle-todas'
import { isDateRangeValid } from '../lib/validate-date-range'
import { getActiveBadges } from '../lib/derive-active-badges'
import { formatPeriodLabel } from '../lib/format-period-label'
import { isDraftEqualToApplied } from '../lib/is-draft-equal-to-applied'

// ─── Initial State ─────────────────────────────────────────────────────────────

export function buildInitialState(): DashboardFilterState {
  const defaults = buildDefaultFilters()
  return { draft: defaults, applied: defaults }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function dashboardFilterReducer(
  state: DashboardFilterState,
  action: DashboardFilterAction
): DashboardFilterState {
  switch (action.type) {
    case 'SET_DATE_RANGE':
      return { ...state, draft: { ...state.draft, dateRange: action.payload } }

    case 'SET_STATUS':
      return { ...state, draft: { ...state.draft, statuses: [action.payload] } }

    case 'TOGGLE_CATEGORY':
      return {
        ...state,
        draft: {
          ...state.draft,
          categoryIds: toggleItem(state.draft.categoryIds, action.id),
        },
      }

    case 'TOGGLE_COMPANY': {
      const newCompanyIds = toggleItem(state.draft.companyIds, action.id)
      // Cascade: compute effective products ONCE — no resolvedX2
      const newProductIds =
        newCompanyIds.length === 0
          ? []
          : deriveActiveProductIds(state.draft.productIds, newCompanyIds, action.allProducts)
      return {
        ...state,
        draft: {
          ...state.draft,
          companyIds: newCompanyIds,
          productIds: newProductIds,
        },
      }
    }

    case 'TOGGLE_PRODUCT':
      return {
        ...state,
        draft: {
          ...state.draft,
          productIds: toggleItem(state.draft.productIds, action.id),
        },
      }

    case 'TOGGLE_ORIGIN':
      return {
        ...state,
        draft: {
          ...state.draft,
          originIds: toggleItem(state.draft.originIds, action.id),
        },
      }

    case 'SET_COMPANY_IDS': {
      const newProductIds = deriveActiveProductIds(
        state.draft.productIds,
        action.ids,
        action.allProducts,
      )
      return {
        ...state,
        draft: { ...state.draft, companyIds: action.ids, productIds: newProductIds },
      }
    }

    case 'SET_PRODUCT_IDS':
      return { ...state, draft: { ...state.draft, productIds: action.ids } }

    case 'SET_CATEGORY_IDS':
      return { ...state, draft: { ...state.draft, categoryIds: action.ids } }

    case 'SET_ORIGIN_IDS':
      return { ...state, draft: { ...state.draft, originIds: action.ids } }

    case 'SET_PLAZO':
      return { ...state, draft: { ...state.draft, plazos: [action.payload] } }

    case 'SET_PERIODICIDAD':
      return { ...state, draft: { ...state.draft, periodicidades: [action.payload] } }

    case 'SET_INTERNACIONAL':
      return { ...state, draft: { ...state.draft, isInternacional: action.value } }

    case 'SET_HAS_SUPPORTS':
      return { ...state, draft: { ...state.draft, hasSupports: action.payload } }

    case 'SET_TODAS': {
      // Resetting companyIds also resets productIds (cascade)
      if (action.field === 'companyIds') {
        return {
          ...state,
          draft: { ...state.draft, companyIds: [], productIds: [] },
        }
      }
      return {
        ...state,
        draft: { ...state.draft, [action.field as FilterField]: [] },
      }
    }

    case 'APPLY': {
      const { draft } = state
      if (!isDateRangeValid(draft.dateRange.start, draft.dateRange.end)) return state
      return { ...state, applied: { ...draft } }
    }

    case 'CLEAR': {
      const defaults = buildDefaultFilters()
      return { draft: defaults, applied: defaults }
    }

    default:
      return state
  }
}

// ─── Context value type ───────────────────────────────────────────────────────

type DashboardFilterContextValue = {
  draft: DashboardFilterDraft
  appliedFilters: DashboardAppliedFilters
  dispatch: Dispatch<DashboardFilterAction>
  isApplyEnabled: boolean
  periodLabel: string
  activeBadges: ActiveBadge[]
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const DashboardFilterContext =
  createContext<DashboardFilterContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

type DashboardFilterProviderProps = {
  children: ReactNode
}

export function DashboardFilterProvider({ children }: DashboardFilterProviderProps) {
  const [state, dispatch] = useReducer(dashboardFilterReducer, undefined, buildInitialState)

  const { draft, applied } = state

  const isApplyEnabled =
    !isDraftEqualToApplied(draft, applied) &&
    isDateRangeValid(draft.dateRange.start, draft.dateRange.end)

  const periodLabel = formatPeriodLabel(applied.dateRange.start, applied.dateRange.end)
  const activeBadges = getActiveBadges(applied)

  return (
    <DashboardFilterContext.Provider
      value={{
        draft,
        appliedFilters: applied,
        dispatch,
        isApplyEnabled,
        periodLabel,
        activeBadges,
      }}
    >
      {children}
    </DashboardFilterContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useDashboardFilter(): DashboardFilterContextValue {
  const ctx = useContext(DashboardFilterContext)

  if (!ctx) {
    throw new Error(
      'useDashboardFilter must be used within DashboardFilterProvider. ' +
        'Wrap the component tree with <DashboardFilterProvider>.'
    )
  }

  return ctx
}
