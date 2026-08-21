/**
 * Producción Real report domain types (COM-81).
 * Filters, KPI aggregates, detail cursor pagination, currency modes.
 */

import type { ContributionType } from '@prisma/client'

/** Currency display / filter mode for Producción Real. */
export const CURRENCY_MODE = {
	ALL_TRM: 'ALL_TRM',
	FOREIGN: 'FOREIGN',
	COP: 'COP',
} as const

export type CurrencyMode = (typeof CURRENCY_MODE)[keyof typeof CURRENCY_MODE]

/** Display currency code after applying mode + optional TRM. */
export const DISPLAY_CURRENCY = {
	USD: 'USD',
	COP: 'COP',
	FOREIGN: 'FOREIGN',
} as const

export type DisplayCurrencyCode =
	(typeof DISPLAY_CURRENCY)[keyof typeof DISPLAY_CURRENCY]

/** COP currency primary key in `currency` table (dashboard convention). */
export const COP_CURRENCY_ID = 1

/** Global MFUND exclusion: SKANDIA company + MFUND product. */
export const MFUND_EXCLUSION = {
	COMPANY_NAME: 'SKANDIA',
	PRODUCT_NAME: 'MFUND',
} as const

/**
 * Defensive Único KPI rule: exclude businesses with any Payment
 * where installmentIndex >= this value (2ª+ Anualidad).
 */
export const SECOND_PLUS_ANNUALIDAD_MIN_INDEX = 2

export const BUSINESS_STATUS = {
	FONDEADO: 'FONDEADO',
} as const

export const CONTRIBUTION_TYPE = {
	REGULAR: 'REGULAR',
	UNICO: 'UNICO',
} as const satisfies Record<string, ContributionType>

export type ProduccionRealContributionType =
	(typeof CONTRIBUTION_TYPE)[keyof typeof CONTRIBUTION_TYPE]

/** Applied / drafted report filters (date-only strings are Bogotá civil days). */
export interface ProduccionRealFilters {
	readonly dateFrom: string
	readonly dateTo: string
	/** Empty = Todas (Regular + Único). */
	readonly contributionTypes: readonly ProduccionRealContributionType[]
	/** Empty = Todas (catalog includes SKANDIA). */
	readonly companyIds: readonly number[]
	readonly currencyMode: CurrencyMode
	/**
	 * Hierarchy selection already intersected with viewer scope.
	 * Empty → zero KPIs / empty detail (no out-of-scope leak).
	 */
	readonly userIds: readonly number[]
}

export interface CurrencySplit {
	readonly totalCop: number
	readonly totalForeignUsd: number
	readonly count: number
}

export interface KpiMetric {
	readonly sum: number
	readonly count: number
}

export interface FondeadoKpiMetric extends KpiMetric {
	readonly conversionPercent: number
}

export interface ProduccionRealKpis {
	readonly produccionReal: KpiMetric
	readonly regular: KpiMetric
	readonly unico: KpiMetric
	readonly fondeado: FondeadoKpiMetric
	readonly currencyMode: CurrencyMode
	readonly displayCurrencyCode: DisplayCurrencyCode
}

export interface ProduccionRealDetailCursor {
	readonly createdAt: string
	readonly idBusiness: number
}

export interface ProduccionRealDetailRow {
	readonly idBusiness: number
	readonly createdAt: string
	readonly createdAtLabel: string
	readonly clientName: string
	readonly agentName: string
	readonly companyName: string
	readonly productName: string
	readonly contributionType: ProduccionRealContributionType
	readonly contributionTypeLabel: string
	readonly status: string | null
	readonly value: number
	readonly dateIssued: string | null
	readonly dateIssuedLabel: string
	readonly dateAnchored: string | null
	readonly dateAnchoredLabel: string
	readonly idCurrency: number
}

export interface ProduccionRealDetailPage {
	readonly rows: readonly ProduccionRealDetailRow[]
	readonly nextCursor: ProduccionRealDetailCursor | null
	readonly hasMore: boolean
}

export interface ProduccionRealKpiQuery {
	readonly filters: ProduccionRealFilters
	/** Required for ALL_TRM COP→USD; ignored for FOREIGN/COP modes. */
	readonly trmRate: number | null
}

export interface ProduccionRealDetailQuery {
	readonly filters: ProduccionRealFilters
	readonly trmRate: number | null
	readonly cursor: ProduccionRealDetailCursor | null
	readonly limit: number
}
