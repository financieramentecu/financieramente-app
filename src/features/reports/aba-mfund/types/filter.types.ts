/**
 * Draft / applied filter state for ABA-MFUND UI (excludes hierarchy userIds).
 */

import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'

export interface AbaMfundFilterDraft {
	readonly dateFrom: string
	readonly dateTo: string
	/** Empty = Todos (includes CANCELADO). */
	readonly statuses: readonly BusinessStatus[]
}

export type AbaMfundFilterApplied = Readonly<AbaMfundFilterDraft>

export const ABA_MFUND_FILTER_ACTION = {
	SET_DATE_FROM: 'SET_DATE_FROM',
	SET_DATE_TO: 'SET_DATE_TO',
	SET_STATUSES: 'SET_STATUSES',
	APPLY: 'APPLY',
	CLEAR: 'CLEAR',
} as const

export type AbaMfundFilterActionType =
	(typeof ABA_MFUND_FILTER_ACTION)[keyof typeof ABA_MFUND_FILTER_ACTION]

export type AbaMfundFilterAction =
	| { type: typeof ABA_MFUND_FILTER_ACTION.SET_DATE_FROM; dateFrom: string }
	| { type: typeof ABA_MFUND_FILTER_ACTION.SET_DATE_TO; dateTo: string }
	| {
			type: typeof ABA_MFUND_FILTER_ACTION.SET_STATUSES
			statuses: readonly BusinessStatus[]
	  }
	| { type: typeof ABA_MFUND_FILTER_ACTION.APPLY }
	| { type: typeof ABA_MFUND_FILTER_ACTION.CLEAR }

export interface AbaMfundFilterState {
	draft: AbaMfundFilterDraft
	applied: AbaMfundFilterApplied
}
