'use client'

import {
	createContext,
	useContext,
	useReducer,
	type Dispatch,
	type ReactNode,
} from 'react'
import {
	buildInitialLeadsAnalyticsFilterState,
	getLeadsAnalyticsDateRangeError,
	isLeadsAnalyticsDraftEqualToApplied,
	leadsAnalyticsFilterReducer,
} from '../lib/leads-analytics-filter-reducer'
import {
	LEADS_ANALYTICS_FILTER_ACTION,
	type LeadsAnalyticsFilterAction,
	type LeadsAnalyticsFilterApplied,
	type LeadsAnalyticsFilterDraft,
} from '../types/filter.types'

export { LEADS_ANALYTICS_FILTER_ACTION }

interface LeadsAnalyticsFilterContextValue {
	readonly draft: LeadsAnalyticsFilterDraft
	readonly applied: LeadsAnalyticsFilterApplied
	readonly dispatch: Dispatch<LeadsAnalyticsFilterAction>
	readonly isApplyEnabled: boolean
	readonly dateRangeError: string | undefined
}

const LeadsAnalyticsFilterContext =
	createContext<LeadsAnalyticsFilterContextValue | null>(null)

export function LeadsAnalyticsFilterProvider({
	children,
}: {
	children: ReactNode
}) {
	const [state, dispatch] = useReducer(
		leadsAnalyticsFilterReducer,
		undefined,
		buildInitialLeadsAnalyticsFilterState
	)

	const dateRangeError = getLeadsAnalyticsDateRangeError(
		state.draft.dateFrom,
		state.draft.dateTo
	)
	const isApplyEnabled =
		dateRangeError === undefined &&
		!isLeadsAnalyticsDraftEqualToApplied(state.draft, state.applied)

	return (
		<LeadsAnalyticsFilterContext.Provider
			value={{
				draft: state.draft,
				applied: state.applied,
				dispatch,
				isApplyEnabled,
				dateRangeError,
			}}
		>
			{children}
		</LeadsAnalyticsFilterContext.Provider>
	)
}

export function useLeadsAnalyticsFilter(): LeadsAnalyticsFilterContextValue {
	const ctx = useContext(LeadsAnalyticsFilterContext)
	if (!ctx) {
		throw new Error(
			'useLeadsAnalyticsFilter must be used within LeadsAnalyticsFilterProvider'
		)
	}
	return ctx
}
