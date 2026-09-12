/**
 * Pure draft/apply reducer for ABA-MFUND filters.
 * Invalid date range (dateFrom > dateTo) blocks APPLY.
 */

import { ABA_MFUND_UI } from './ui-copy'
import { buildDefaultAbaMfundFilters } from './default-filters'
import { isIsoDateRangeValid } from './filter-date'
import {
	ABA_MFUND_FILTER_ACTION,
	type AbaMfundFilterAction,
	type AbaMfundFilterApplied,
	type AbaMfundFilterDraft,
	type AbaMfundFilterState,
} from '../types/filter.types'

function cloneDraft(source: AbaMfundFilterDraft): AbaMfundFilterDraft {
	return {
		dateFrom: source.dateFrom,
		dateTo: source.dateTo,
		statuses: [...source.statuses],
	}
}

function toApplied(draft: AbaMfundFilterDraft): AbaMfundFilterApplied {
	return {
		dateFrom: draft.dateFrom,
		dateTo: draft.dateTo,
		statuses: [...draft.statuses],
	}
}

export function buildInitialAbaMfundFilterState(
	now: Date = new Date()
): AbaMfundFilterState {
	const draft = cloneDraft(buildDefaultAbaMfundFilters(now))
	return { draft, applied: toApplied(draft) }
}

export function getAbaMfundDateRangeError(
	dateFrom: string,
	dateTo: string
): string | undefined {
	return isIsoDateRangeValid(dateFrom, dateTo)
		? undefined
		: ABA_MFUND_UI.ERROR_DATE_RANGE
}

export function isAbaMfundDraftEqualToApplied(
	draft: AbaMfundFilterDraft,
	applied: AbaMfundFilterApplied
): boolean {
	if (draft.dateFrom !== applied.dateFrom) return false
	if (draft.dateTo !== applied.dateTo) return false
	if (draft.statuses.length !== applied.statuses.length) return false
	const appliedSet = new Set(applied.statuses)
	return draft.statuses.every((status) => appliedSet.has(status))
}

export function abaMfundFilterReducer(
	state: AbaMfundFilterState,
	action: AbaMfundFilterAction
): AbaMfundFilterState {
	switch (action.type) {
		case ABA_MFUND_FILTER_ACTION.SET_DATE_FROM:
			return {
				...state,
				draft: { ...state.draft, dateFrom: action.dateFrom },
			}
		case ABA_MFUND_FILTER_ACTION.SET_DATE_TO:
			return {
				...state,
				draft: { ...state.draft, dateTo: action.dateTo },
			}
		case ABA_MFUND_FILTER_ACTION.SET_STATUSES:
			return {
				...state,
				draft: { ...state.draft, statuses: [...action.statuses] },
			}
		case ABA_MFUND_FILTER_ACTION.APPLY: {
			if (!isIsoDateRangeValid(state.draft.dateFrom, state.draft.dateTo)) {
				return state
			}
			return {
				...state,
				applied: toApplied(state.draft),
			}
		}
		case ABA_MFUND_FILTER_ACTION.CLEAR: {
			const draft = cloneDraft(buildDefaultAbaMfundFilters())
			return { draft, applied: toApplied(draft) }
		}
		default:
			return state
	}
}
