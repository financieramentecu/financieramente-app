/**
 * Draft / applied filter state for Producción Real UI (excludes hierarchy userIds).
 */

import type {
	CurrencyMode,
	ProduccionRealContributionType,
} from './produccion-real.types'

export interface ProduccionRealFilterDraft {
	dateFrom: string
	dateTo: string
	/** Empty = Todas (Regular + Único). */
	contributionTypes: ProduccionRealContributionType[]
	/** Empty = Todas. */
	companyIds: number[]
	currencyMode: CurrencyMode
}

export type ProduccionRealFilterApplied = Readonly<ProduccionRealFilterDraft>

export const PRODUCCION_REAL_FILTER_ACTION = {
	SET_DATE_FROM: 'SET_DATE_FROM',
	SET_DATE_TO: 'SET_DATE_TO',
	SET_CONTRIBUTION_TYPES: 'SET_CONTRIBUTION_TYPES',
	SET_COMPANY_IDS: 'SET_COMPANY_IDS',
	SET_CURRENCY_MODE: 'SET_CURRENCY_MODE',
	APPLY: 'APPLY',
	CLEAR: 'CLEAR',
} as const

export type ProduccionRealFilterActionType =
	(typeof PRODUCCION_REAL_FILTER_ACTION)[keyof typeof PRODUCCION_REAL_FILTER_ACTION]

export type ProduccionRealFilterAction =
	| { type: typeof PRODUCCION_REAL_FILTER_ACTION.SET_DATE_FROM; dateFrom: string }
	| { type: typeof PRODUCCION_REAL_FILTER_ACTION.SET_DATE_TO; dateTo: string }
	| {
			type: typeof PRODUCCION_REAL_FILTER_ACTION.SET_CONTRIBUTION_TYPES
			contributionTypes: ProduccionRealContributionType[]
	  }
	| {
			type: typeof PRODUCCION_REAL_FILTER_ACTION.SET_COMPANY_IDS
			companyIds: number[]
	  }
	| {
			type: typeof PRODUCCION_REAL_FILTER_ACTION.SET_CURRENCY_MODE
			currencyMode: CurrencyMode
	  }
	| { type: typeof PRODUCCION_REAL_FILTER_ACTION.APPLY }
	| { type: typeof PRODUCCION_REAL_FILTER_ACTION.CLEAR }

export interface ProduccionRealFilterState {
	draft: ProduccionRealFilterDraft
	applied: ProduccionRealFilterApplied
}
