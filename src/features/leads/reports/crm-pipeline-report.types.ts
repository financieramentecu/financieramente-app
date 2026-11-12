import type { LeadOutcomeStatus } from '@prisma/client'

/** Bogotá `YYYY-MM-DD` range, inclusive, applied to `lead.createdAt`. */
export interface CrmReportRange {
	readonly from: string
	readonly to: string
}

export interface CrmReportQuery extends CrmReportRange {
	readonly ownerIds: readonly number[]
}

// ---- Dataset (service → pure builder). Never carries contact fields. ----

export interface CrmReportLead {
	readonly idLead: number
	readonly idUser: number | null
	readonly idLeadFunnelColumn: number
	readonly outcomeStatus: LeadOutcomeStatus
	readonly originTag: string | null
	/** Decimal string (2 dp) or null. */
	readonly estimatedValue: string | null
	readonly probability: number | null
	readonly createdAt: Date
}

export interface CrmReportStageChange {
	readonly idLead: number
	readonly fromIdLeadFunnelColumn: number | null
	readonly toIdLeadFunnelColumn: number
	readonly changedAt: Date
}

export interface CrmReportStage {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly position: number
	readonly active: boolean
	readonly isFallback: boolean
}

export interface CrmReportOwner {
	readonly idUser: number
	readonly name: string
	readonly idLeader: number | null
	readonly leaderName: string | null
}

export interface CrmReportDataset {
	readonly range: CrmReportRange
	readonly leads: readonly CrmReportLead[]
	readonly stageChanges: readonly CrmReportStageChange[]
	readonly stages: readonly CrmReportStage[]
	readonly owners: readonly CrmReportOwner[]
}

// ---- Report (API response). Rates are fractions 0..1; amounts are decimal strings. ----

export interface CrmReportOutcomes {
	readonly total: number
	readonly open: number
	readonly won: number
	readonly lost: number
	readonly abandoned: number
	/** won / (won + lost + abandoned). */
	readonly winRate: number | null
	/** won / total. */
	readonly conversionRate: number | null
}

export interface CrmReportFunnelStage {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly reached: number
	readonly conversionFromPrevious: number | null
}

export interface CrmReportStageDuration {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly samples: number
	readonly averageDays: number | null
	readonly medianDays: number | null
}

export interface CrmReportBreakdownRow {
	readonly key: string
	readonly label: string
	readonly total: number
	readonly open: number
	readonly won: number
	/** Lost plus abandoned. */
	readonly lost: number
	readonly winRate: number | null
	readonly estimatedValue: string
	readonly weightedValue: string
}

export interface CrmReportForecastStage {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly openLeads: number
	readonly valuedLeads: number
	readonly estimatedValue: string
	readonly weightedValue: string
}

export interface CrmReportForecast {
	readonly stages: readonly CrmReportForecastStage[]
	readonly totals: Omit<CrmReportForecastStage, 'idLeadFunnelColumn' | 'name'>
}

export interface CrmPipelineReport {
	readonly range: CrmReportRange
	readonly outcomes: CrmReportOutcomes
	readonly funnel: readonly CrmReportFunnelStage[]
	readonly stageDurations: readonly CrmReportStageDuration[]
	readonly byOrigin: readonly CrmReportBreakdownRow[]
	readonly byAdvisor: readonly CrmReportBreakdownRow[]
	readonly byTeam: readonly CrmReportBreakdownRow[]
	readonly forecast: CrmReportForecast
}
