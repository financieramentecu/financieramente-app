import { describe, expect, it } from 'vitest'
import {
	buildInitialLeadsAnalyticsFilterState,
	getLeadsAnalyticsDateRangeError,
	isLeadsAnalyticsDraftEqualToApplied,
	leadsAnalyticsFilterReducer,
} from '../lib/leads-analytics-filter-reducer'
import { currentBogotaMonthDateStrings } from '../lib/filter-date'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import { LEADS_ANALYTICS_FILTER_ACTION } from '../types/filter.types'

describe('Leads Analytics filter reducer', () => {
	const now = new Date('2026-08-15T15:00:00.000Z')
	const month = currentBogotaMonthDateStrings(now)

	it('defaults draft and applied to the current Bogotá month', () => {
		const state = buildInitialLeadsAnalyticsFilterState(now)
		expect(state.draft).toEqual(month)
		expect(state.applied).toEqual(month)
		expect(month.dateFrom).toBe('2026-08-01')
		expect(month.dateTo).toBe('2026-08-31')
	})

	it('mutates only draft until APPLY', () => {
		let state = buildInitialLeadsAnalyticsFilterState(now)
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-07-01',
		})
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_TO,
			dateTo: '2026-07-31',
		})

		expect(state.draft).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-31' })
		expect(state.applied).toEqual(month)
		expect(isLeadsAnalyticsDraftEqualToApplied(state.draft, state.applied)).toBe(
			false
		)

		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.APPLY,
		})
		expect(state.applied).toEqual(state.draft)
	})

	it('blocks APPLY when the range is inverted', () => {
		let state = buildInitialLeadsAnalyticsFilterState(now)
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-08-20',
		})
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_TO,
			dateTo: '2026-08-01',
		})

		expect(
			getLeadsAnalyticsDateRangeError(state.draft.dateFrom, state.draft.dateTo)
		).toBe(LEADS_ANALYTICS_UI.ERROR_DATE_RANGE)

		const afterApply = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.APPLY,
		})
		expect(afterApply.applied).toEqual(month)
	})

	it('CLEAR restores the current Bogotá month on draft and applied', () => {
		let state = buildInitialLeadsAnalyticsFilterState(now)
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-01-01',
		})
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.APPLY,
		})
		state = leadsAnalyticsFilterReducer(state, {
			type: LEADS_ANALYTICS_FILTER_ACTION.CLEAR,
		})

		const cleared = currentBogotaMonthDateStrings()
		expect(state.draft).toEqual(cleared)
		expect(state.applied).toEqual(cleared)
	})
})
