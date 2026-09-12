/**
 * ABA-MFUND report domain types.
 * Inverse universe of Producción Real: SKANDIA + MFUND only, COP only.
 */

import type { CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'
import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'

/** COP currency primary key in `currency` table (dashboard convention). */
export const COP_CURRENCY_ID = 1

/**
 * SKANDIA + MFUND names — copied locally (do not import Producción Real exclusion).
 */
export const MFUND_EXCLUSION = {
	COMPANY_NAME: 'SKANDIA',
	PRODUCT_NAME: 'MFUND',
} as const

/** Top N agents in ABA por Agente ranking. */
export const ABA_MFUND_RANKING_TAKE = 6

/** Max businesses embedded per ranking agent (heatmap truncation convention). */
export const ABA_MFUND_RANKING_EMBED_CAP = 500

/** Max detail rows per ABA-MFUND Excel export. Oversize → HTTP 413. */
export const ABA_MFUND_EXPORT_MAX_ROWS = 5000

/** Applied / drafted report filters (date-only strings are Bogotá civil days). */
export interface AbaMfundFilters {
	readonly dateFrom: string
	readonly dateTo: string
	/**
	 * Hierarchy selection already intersected with viewer scope.
	 * Empty → zero KPIs / empty detail (no out-of-scope leak).
	 */
	readonly userIds: readonly number[]
	/** Empty = Todos (includes CANCELADO). */
	readonly statuses: readonly BusinessStatus[]
}

export interface AbaMfundKpiMetric {
	readonly sum: number
	readonly count: number
}

export interface AbaMfundKpis {
	readonly abaTotal: AbaMfundKpiMetric
	readonly fondeado: AbaMfundKpiMetric
	readonly emitido: AbaMfundKpiMetric
	readonly ticketPromedio: number
}

export interface AbaMfundDetailCursor {
	readonly createdAt: string
	readonly idBusiness: number
}

export interface AbaMfundDetailRow {
	readonly idBusiness: number
	readonly createdAt: string
	readonly createdAtLabel: string
	readonly clientName: string
	readonly periodicityName: string
	readonly status: BusinessStatus | null
	readonly value: number
	readonly dateIssued: string | null
	readonly dateIssuedLabel: string
	readonly dateAnchored: string | null
	readonly dateAnchoredLabel: string
}

export interface AbaMfundDetailPage {
	readonly rows: readonly AbaMfundDetailRow[]
	readonly nextCursor: AbaMfundDetailCursor | null
	readonly hasMore: boolean
}

/** Wire shape returned by GET /detail (cursor is base64url-encoded). */
export interface AbaMfundDetailApiPage {
	readonly rows: readonly AbaMfundDetailRow[]
	readonly nextCursor: string | null
	readonly hasMore: boolean
}

/** Accumulated client detail list (same shape as the API page). */
export type AbaMfundDetailData = AbaMfundDetailApiPage

export interface AbaMfundRankingAgent {
	readonly idUser: number
	readonly agentName: string
	readonly totalValue: number
	readonly businessCount: number
	readonly businesses: readonly CellBusinessRowView[]
}

export interface AbaMfundRanking {
	readonly agents: readonly AbaMfundRankingAgent[]
}

export interface AbaMfundKpiQuery {
	readonly filters: AbaMfundFilters
}

export interface AbaMfundDetailQuery {
	readonly filters: AbaMfundFilters
	readonly cursor: AbaMfundDetailCursor | null
	readonly limit: number
}

export interface AbaMfundRankingQuery {
	readonly filters: AbaMfundFilters
}
