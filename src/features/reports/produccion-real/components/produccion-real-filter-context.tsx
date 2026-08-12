'use client'

import {
	createContext,
	useContext,
	useReducer,
	type Dispatch,
	type ReactNode,
} from 'react'
import { buildDefaultProduccionRealFilters } from '../lib/default-filters'
import { isIsoDateRangeValid } from '../lib/filter-date'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'
import {
	PRODUCCION_REAL_FILTER_ACTION,
	type ProduccionRealFilterAction,
	type ProduccionRealFilterApplied,
	type ProduccionRealFilterDraft,
	type ProduccionRealFilterState,
} from '../types/filter.types'

export { PRODUCCION_REAL_FILTER_ACTION }

function cloneDraft(source: ProduccionRealFilterDraft): ProduccionRealFilterDraft {
	return {
		dateFrom: source.dateFrom,
		dateTo: source.dateTo,
		contributionTypes: [...source.contributionTypes],
		companyIds: [...source.companyIds],
		currencyMode: source.currencyMode,
	}
}

function toApplied(draft: ProduccionRealFilterDraft): ProduccionRealFilterApplied {
	return {
		dateFrom: draft.dateFrom,
		dateTo: draft.dateTo,
		contributionTypes: [...draft.contributionTypes],
		companyIds: [...draft.companyIds],
		currencyMode: draft.currencyMode,
	}
}

function buildInitialState(): ProduccionRealFilterState {
	const defaults = buildDefaultProduccionRealFilters()
	const draft: ProduccionRealFilterDraft = {
		dateFrom: defaults.dateFrom,
		dateTo: defaults.dateTo,
		contributionTypes: [...defaults.contributionTypes],
		companyIds: [...defaults.companyIds],
		currencyMode: defaults.currencyMode,
	}
	return { draft, applied: toApplied(draft) }
}

function isDraftEqualToApplied(
	draft: ProduccionRealFilterDraft,
	applied: ProduccionRealFilterApplied
): boolean {
	if (draft.dateFrom !== applied.dateFrom) return false
	if (draft.dateTo !== applied.dateTo) return false
	if (draft.currencyMode !== applied.currencyMode) return false
	if (draft.contributionTypes.length !== applied.contributionTypes.length) {
		return false
	}
	if (draft.companyIds.length !== applied.companyIds.length) return false
	for (let i = 0; i < draft.contributionTypes.length; i++) {
		if (draft.contributionTypes[i] !== applied.contributionTypes[i]) return false
	}
	const draftCompanies = [...draft.companyIds].sort((a, b) => a - b)
	const appliedCompanies = [...applied.companyIds].sort((a, b) => a - b)
	for (let i = 0; i < draftCompanies.length; i++) {
		if (draftCompanies[i] !== appliedCompanies[i]) return false
	}
	return true
}

export function produccionRealFilterReducer(
	state: ProduccionRealFilterState,
	action: ProduccionRealFilterAction
): ProduccionRealFilterState {
	switch (action.type) {
		case PRODUCCION_REAL_FILTER_ACTION.SET_DATE_FROM:
			return {
				...state,
				draft: { ...state.draft, dateFrom: action.dateFrom },
			}
		case PRODUCCION_REAL_FILTER_ACTION.SET_DATE_TO:
			return {
				...state,
				draft: { ...state.draft, dateTo: action.dateTo },
			}
		case PRODUCCION_REAL_FILTER_ACTION.SET_CONTRIBUTION_TYPES:
			return {
				...state,
				draft: {
					...state.draft,
					contributionTypes: [...action.contributionTypes],
				},
			}
		case PRODUCCION_REAL_FILTER_ACTION.SET_COMPANY_IDS:
			return {
				...state,
				draft: { ...state.draft, companyIds: [...action.companyIds] },
			}
		case PRODUCCION_REAL_FILTER_ACTION.SET_CURRENCY_MODE:
			return {
				...state,
				draft: { ...state.draft, currencyMode: action.currencyMode },
			}
		case PRODUCCION_REAL_FILTER_ACTION.APPLY:
			return {
				...state,
				applied: toApplied(state.draft),
			}
		case PRODUCCION_REAL_FILTER_ACTION.CLEAR: {
			const defaults = buildDefaultProduccionRealFilters()
			const draft = cloneDraft({
				dateFrom: defaults.dateFrom,
				dateTo: defaults.dateTo,
				contributionTypes: [...defaults.contributionTypes],
				companyIds: [...defaults.companyIds],
				currencyMode: defaults.currencyMode,
			})
			return { draft, applied: toApplied(draft) }
		}
		default:
			return state
	}
}

interface ProduccionRealFilterContextValue {
	readonly draft: ProduccionRealFilterDraft
	readonly applied: ProduccionRealFilterApplied
	readonly dispatch: Dispatch<ProduccionRealFilterAction>
	readonly isApplyEnabled: boolean
	readonly dateRangeError: string | undefined
}

const ProduccionRealFilterContext =
	createContext<ProduccionRealFilterContextValue | null>(null)

export function ProduccionRealFilterProvider({
	children,
}: {
	children: ReactNode
}) {
	const [state, dispatch] = useReducer(
		produccionRealFilterReducer,
		undefined,
		buildInitialState
	)

	const dateRangeValid = isIsoDateRangeValid(
		state.draft.dateFrom,
		state.draft.dateTo
	)
	const isApplyEnabled =
		dateRangeValid && !isDraftEqualToApplied(state.draft, state.applied)

	return (
		<ProduccionRealFilterContext.Provider
			value={{
				draft: state.draft,
				applied: state.applied,
				dispatch,
				isApplyEnabled,
				dateRangeError: dateRangeValid
					? undefined
					: PRODUCCION_REAL_UI.ERROR_DATE_RANGE,
			}}
		>
			{children}
		</ProduccionRealFilterContext.Provider>
	)
}

export function useProduccionRealFilter(): ProduccionRealFilterContextValue {
	const ctx = useContext(ProduccionRealFilterContext)
	if (!ctx) {
		throw new Error(
			'useProduccionRealFilter must be used within ProduccionRealFilterProvider'
		)
	}
	return ctx
}
