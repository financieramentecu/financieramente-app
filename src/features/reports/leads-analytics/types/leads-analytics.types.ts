/**
 * Leads Analytics report domain types.
 * Date-filtered follow-up bars, converted-lead slices, and MS heatmap.
 */

import type { LeadOutcomeStatus } from '@prisma/client'

export interface LeadsAnalyticsDateRange {
	readonly dateFrom: string
	readonly dateTo: string
}

export interface FollowUpStatusBar {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly position: number
	readonly count: number
}

export interface ConvertedLeadSlice {
	readonly outcomeStatus: LeadOutcomeStatus
	readonly label: string
	readonly count: number
}

export interface ConvertedLeadsMetric {
	readonly total: number
	readonly slices: readonly ConvertedLeadSlice[]
}

export interface HeatmapColumn {
	readonly idLeadFunnelColumn: number
	readonly name: string
}

export interface HeatmapRow {
	readonly idUser: number | null
	readonly ownerName: string
	readonly cells: readonly number[]
	readonly rowTotal: number
}

export interface LeadsAnalyticsHeatmap {
	readonly columns: readonly HeatmapColumn[]
	readonly rows: readonly HeatmapRow[]
	readonly maxCellCount: number
}

export interface LeadsAnalyticsReport {
	readonly followUpBars: readonly FollowUpStatusBar[]
	readonly converted: ConvertedLeadsMetric
	readonly heatmap: LeadsAnalyticsHeatmap
}

export interface FunnelColumnRef {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly position: number
}

export interface HeatmapRawCell {
	readonly idUser: number | null
	readonly idLeadFunnelColumn: number
	readonly count: number
}

export interface OwnerRef {
	readonly idUser: number
	readonly name: string
}
