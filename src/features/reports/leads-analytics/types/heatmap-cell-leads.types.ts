/**
 * Heatmap / funnel-bar expansion: lead rows for one follow-up column.
 */

import type { LeadOutcomeStatus } from '@prisma/client'
import type { CellOwnerFilter } from '../lib/cell-owner-filter'

export const HEATMAP_CELL_LEADS_CAP = 500

export interface CellLeadRowView {
	readonly idLead: number
	readonly leadName: string
	readonly ownerName: string
	readonly outcomeStatus: LeadOutcomeStatus
	readonly outcomeLabel: string
	readonly createdAtLabel: string
	readonly idBusiness: number | null
}

export interface CellLeadList {
	readonly leads: readonly CellLeadRowView[]
	readonly total: number
	readonly isTruncated: boolean
}

export interface HeatmapCellLeadsQuery {
	readonly dateFrom: string
	readonly dateTo: string
	readonly userIds: readonly number[]
	readonly idLeadFunnelColumn: number
	readonly ownerFilter: CellOwnerFilter
}
