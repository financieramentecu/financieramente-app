import { describe, expect, it } from 'vitest'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	abaMfundFilterReducer,
	buildInitialAbaMfundFilterState,
	getAbaMfundDateRangeError,
} from '../lib/aba-mfund-filter-reducer'
import { currentBogotaMonthDateStrings } from '../lib/default-filters'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import { ABA_MFUND_FILTER_ACTION } from '../types/filter.types'

describe('ABA-MFUND filter defaults and reducer', () => {
	const now = new Date('2026-08-15T15:00:00.000Z')
	const month = currentBogotaMonthDateStrings(now)

	it('defaults to current Bogotá month, Estado Todos, and Jerarquía Toda (empty statuses)', () => {
		const state = buildInitialAbaMfundFilterState(now)
		expect(state.draft.dateFrom).toBe(month.dateFrom)
		expect(state.draft.dateTo).toBe(month.dateTo)
		expect(state.draft.statuses).toEqual([])
		expect(state.applied).toEqual(state.draft)
		expect(month.dateFrom).toBe('2026-08-01')
		expect(month.dateTo).toBe('2026-08-31')
		expect(ABA_MFUND_UI.ALL).toBe('Todos')
		expect(ABA_MFUND_UI.HIERARCHY_ALL).toBe('Toda')
	})

	it('SET_DATE_* and SET_STATUSES only mutate draft until APPLY', () => {
		let state = buildInitialAbaMfundFilterState(now)
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-07-01',
		})
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_DATE_TO,
			dateTo: '2026-07-31',
		})
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_STATUSES,
			statuses: [BUSINESS_STATUS.FONDEADO],
		})

		expect(state.draft.dateFrom).toBe('2026-07-01')
		expect(state.draft.dateTo).toBe('2026-07-31')
		expect(state.draft.statuses).toEqual([BUSINESS_STATUS.FONDEADO])
		expect(state.applied.dateFrom).toBe(month.dateFrom)
		expect(state.applied.statuses).toEqual([])

		state = abaMfundFilterReducer(state, { type: ABA_MFUND_FILTER_ACTION.APPLY })
		expect(state.applied.dateFrom).toBe('2026-07-01')
		expect(state.applied.dateTo).toBe('2026-07-31')
		expect(state.applied.statuses).toEqual([BUSINESS_STATUS.FONDEADO])
	})

	it('blocks APPLY when dateFrom > dateTo and exposes ERROR_DATE_RANGE', () => {
		let state = buildInitialAbaMfundFilterState(now)
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-08-20',
		})
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_DATE_TO,
			dateTo: '2026-08-01',
		})

		expect(getAbaMfundDateRangeError(state.draft.dateFrom, state.draft.dateTo)).toBe(
			ABA_MFUND_UI.ERROR_DATE_RANGE
		)

		const afterApply = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.APPLY,
		})
		expect(afterApply.applied.dateFrom).toBe(month.dateFrom)
		expect(afterApply.applied.dateTo).toBe(month.dateTo)
	})

	it('CLEAR (Limpiar) restores Bogotá month defaults and empty statuses', () => {
		let state = buildInitialAbaMfundFilterState(now)
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_DATE_FROM,
			dateFrom: '2026-01-01',
		})
		state = abaMfundFilterReducer(state, {
			type: ABA_MFUND_FILTER_ACTION.SET_STATUSES,
			statuses: [BUSINESS_STATUS.CANCELADO],
		})
		state = abaMfundFilterReducer(state, { type: ABA_MFUND_FILTER_ACTION.APPLY })
		state = abaMfundFilterReducer(state, { type: ABA_MFUND_FILTER_ACTION.CLEAR })

		const clearedMonth = currentBogotaMonthDateStrings()
		expect(state.draft.dateFrom).toBe(clearedMonth.dateFrom)
		expect(state.draft.dateTo).toBe(clearedMonth.dateTo)
		expect(state.draft.statuses).toEqual([])
		expect(state.applied.statuses).toEqual([])
	})
})
