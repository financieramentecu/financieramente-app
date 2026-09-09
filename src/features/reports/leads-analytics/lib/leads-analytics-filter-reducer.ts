/**
 * Pure draft/apply reducer for Leads Analytics date filters.
 */

import { currentBogotaMonthDateStrings, isIsoDateRangeValid } from './filter-date'
import { LEADS_ANALYTICS_UI } from './ui-copy'
import {
	LEADS_ANALYTICS_FILTER_ACTION,
	type LeadsAnalyticsFilterAction,
	type LeadsAnalyticsFilterApplied,
	type LeadsAnalyticsFilterDraft,
	type LeadsAnalyticsFilterState,
} from '../types/filter.types'

function cloneDraft(source: LeadsAnalyticsFilterDraft): LeadsAnalyticsFilterDraft {
	return { dateFrom: source.dateFrom, dateTo: source.dateTo }
}

function toApplied(draft: LeadsAnalyticsFilterDraft): LeadsAnalyticsFilterApplied {
	return { dateFrom: draft.dateFrom, dateTo: draft.dateTo }
}

export function buildInitialLeadsAnalyticsFilterState(
	now: Date = new Date()
): LeadsAnalyticsFilterState {
	const draft = cloneDraft(currentBogotaMonthDateStrings(now))
	return { draft, applied: toApplied(draft) }
}

export function getLeadsAnalyticsDateRangeError(
	dateFrom: string,
	dateTo: string
): string | undefined {
	return isIsoDateRangeValid(dateFrom, dateTo)
		? undefined
		: LEADS_ANALYTICS_UI.ERROR_DATE_RANGE
}

export function isLeadsAnalyticsDraftEqualToApplied(
	draft: LeadsAnalyticsFilterDraft,
	applied: LeadsAnalyticsFilterApplied
): boolean {
	return draft.dateFrom === applied.dateFrom && draft.dateTo === applied.dateTo
}

export function leadsAnalyticsFilterReducer(
	state: LeadsAnalyticsFilterState,
	action: LeadsAnalyticsFilterAction
): LeadsAnalyticsFilterState {
	switch (action.type) {
		case LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM:
			return {
				...state,
				draft: { ...state.draft, dateFrom: action.dateFrom },
			}
		case LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_TO:
			return {
				...state,
				draft: { ...state.draft, dateTo: action.dateTo },
			}
		case LEADS_ANALYTICS_FILTER_ACTION.APPLY: {
			if (!isIsoDateRangeValid(state.draft.dateFrom, state.draft.dateTo)) {
				return state
			}
			return { ...state, applied: toApplied(state.draft) }
		}
		case LEADS_ANALYTICS_FILTER_ACTION.CLEAR: {
			const draft = cloneDraft(currentBogotaMonthDateStrings())
			return { draft, applied: toApplied(draft) }
		}
		default:
			return state
	}
}
