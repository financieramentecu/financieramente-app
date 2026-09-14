/**
 * Draft / applied date filters for Leads Analytics (hierarchy lives outside).
 */

export interface LeadsAnalyticsFilterDraft {
	readonly dateFrom: string
	readonly dateTo: string
}

export type LeadsAnalyticsFilterApplied = Readonly<LeadsAnalyticsFilterDraft>

export const LEADS_ANALYTICS_FILTER_ACTION = {
	SET_DATE_FROM: 'SET_DATE_FROM',
	SET_DATE_TO: 'SET_DATE_TO',
	APPLY: 'APPLY',
	CLEAR: 'CLEAR',
} as const

export type LeadsAnalyticsFilterAction =
	| {
			type: typeof LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM
			dateFrom: string
	  }
	| { type: typeof LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_TO; dateTo: string }
	| { type: typeof LEADS_ANALYTICS_FILTER_ACTION.APPLY }
	| { type: typeof LEADS_ANALYTICS_FILTER_ACTION.CLEAR }

export interface LeadsAnalyticsFilterState {
	draft: LeadsAnalyticsFilterDraft
	applied: LeadsAnalyticsFilterApplied
}
