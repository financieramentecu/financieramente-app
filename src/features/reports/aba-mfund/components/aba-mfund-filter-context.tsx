'use client'

import {
	createContext,
	useContext,
	useReducer,
	type Dispatch,
	type ReactNode,
} from 'react'
import {
	abaMfundFilterReducer,
	buildInitialAbaMfundFilterState,
	getAbaMfundDateRangeError,
	isAbaMfundDraftEqualToApplied,
} from '../lib/aba-mfund-filter-reducer'
import {
	ABA_MFUND_FILTER_ACTION,
	type AbaMfundFilterAction,
	type AbaMfundFilterApplied,
	type AbaMfundFilterDraft,
} from '../types/filter.types'

export { ABA_MFUND_FILTER_ACTION }

interface AbaMfundFilterContextValue {
	readonly draft: AbaMfundFilterDraft
	readonly applied: AbaMfundFilterApplied
	readonly dispatch: Dispatch<AbaMfundFilterAction>
	readonly isApplyEnabled: boolean
	readonly dateRangeError: string | undefined
}

const AbaMfundFilterContext = createContext<AbaMfundFilterContextValue | null>(
	null
)

export function AbaMfundFilterProvider({
	children,
}: {
	children: ReactNode
}) {
	const [state, dispatch] = useReducer(
		abaMfundFilterReducer,
		undefined,
		buildInitialAbaMfundFilterState
	)

	const dateRangeError = getAbaMfundDateRangeError(
		state.draft.dateFrom,
		state.draft.dateTo
	)
	const isApplyEnabled =
		dateRangeError === undefined &&
		!isAbaMfundDraftEqualToApplied(state.draft, state.applied)

	return (
		<AbaMfundFilterContext.Provider
			value={{
				draft: state.draft,
				applied: state.applied,
				dispatch,
				isApplyEnabled,
				dateRangeError,
			}}
		>
			{children}
		</AbaMfundFilterContext.Provider>
	)
}

export function useAbaMfundFilter(): AbaMfundFilterContextValue {
	const ctx = useContext(AbaMfundFilterContext)
	if (!ctx) {
		throw new Error(
			'useAbaMfundFilter must be used within AbaMfundFilterProvider'
		)
	}
	return ctx
}
