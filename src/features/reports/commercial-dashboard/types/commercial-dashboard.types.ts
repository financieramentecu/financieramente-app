/**
 * Commercial Dashboard report domain types.
 * Funnel, KPIs, per-MS performance and stuck leads, derived from the CRM
 * stage history (`lead_stage_event`) plus the current lead state.
 */

export interface CommercialDateRange {
	readonly dateFrom: string
	readonly dateTo: string
}

export interface CommercialKpis {
	readonly newLeads: number
	/** Left the initial "Lead nuevo" stage (the Sheet's "Sacados de Lead nuevo"). */
	readonly handled: number
	readonly contacted: number
	/** Contacted within 1 h of creation; null when no first contact has a recorded time. */
	readonly contactedWithinHour: number | null
	/** Leads whose first contact has a recorded time (base of the 1 h ratio). */
	readonly contactTimed: number
	readonly appointments: number
	readonly attended: number
	readonly noShow: number
	readonly proposals: number
	/** Won in the CRM. */
	readonly won: number
	/** Linked to a business in the platform. */
	readonly withBusiness: number
	readonly funded: number
}

/** Same range length right before the selected one, for comparison. */
export interface CommercialPeriodTotals {
	readonly dateFrom: string
	readonly dateTo: string
	readonly newLeads: number
	readonly won: number
	readonly withBusiness: number
	readonly funded: number
}

export interface CommercialFunnelStep {
	readonly key: string
	readonly label: string
	readonly count: number
}

export interface CommercialMsRow {
	readonly idUser: number | null
	readonly ownerName: string
	readonly leads: number
	readonly handled: number
	readonly contacted: number
	readonly contactedWithinHour: number | null
	readonly contactTimed: number
	readonly appointments: number
	readonly attended: number
	readonly noShow: number
	readonly stuck: number
	readonly won: number
	readonly withBusiness: number
	readonly funded: number
	readonly cancelled: number
}

export interface CommercialStuckLead {
	readonly idLead: number
	readonly name: string
	readonly ownerName: string
	readonly stageName: string
	readonly daysStuck: number
}

export interface CommercialPipelineOption {
	/** Pipeline name, or NO_PIPELINE for leads without one. */
	readonly name: string
	readonly count: number
}

export interface CommercialDashboardReport {
	/** Pipelines present in the date range, regardless of the active filter. */
	readonly pipelines: readonly CommercialPipelineOption[]
	readonly kpis: CommercialKpis
	readonly funnel: readonly CommercialFunnelStep[]
	readonly msRows: readonly CommercialMsRow[]
	readonly stuck: readonly CommercialStuckLead[]
	readonly stuckTotal: number
	/** Leads in range with no Money Strategist (admin scope only; 0 otherwise). */
	readonly unassigned: number
	/** True once at least one stage event exists for the cohort. */
	readonly hasStageHistory: boolean
	/** New leads per week (Monday, Bogotá) and origin. */
	readonly weekly: readonly CommercialWeeklyPoint[]
	/** Conversion by lead origin, biggest first. */
	readonly origins: readonly CommercialOriginRow[]
	/** Totals for the previous period of the same length; null when not loaded. */
	readonly previous: CommercialPeriodTotals | null
	/** Previous-period leads and won per origin, for the origin cards. */
	readonly previousByOrigin: readonly CommercialOriginPrevious[]
}

export interface CommercialOriginPrevious {
	readonly origin: string
	readonly leads: number
	readonly won: number
}

export interface CommercialWeeklyPoint {
	/** Monday of the week, YYYY-MM-DD (Bogotá). */
	readonly week: string
	readonly origin: string
	readonly leads: number
}

export interface CommercialOriginRow {
	readonly origin: string
	readonly leads: number
	readonly handled: number
	readonly appointments: number
	readonly attended: number
	readonly proposals: number
	/** Won in the CRM. */
	readonly won: number
	readonly lost: number
	readonly abandoned: number
	/** Leads linked to a business in the platform. */
	readonly withBusiness: number
	readonly funded: number
	readonly cancelled: number
	/** Mean days from creation to Won/Cierre, won leads only; null without history. */
	readonly avgDaysToWon: number | null
	/** Mean days from lead creation to its business being created. */
	readonly avgDaysToBusiness: number | null
	/** Mean days from lead creation to the business funding date. */
	readonly avgDaysToFunded: number | null
	/** Reported value of funded businesses, by currency (no exchange rate). */
	readonly fundedCop: number
	readonly fundedUsd: number
}

/** Minimal lead row needed to build the report (no personal data). */
export interface CommercialLeadInput {
	readonly idLead: number
	readonly idUser: number | null
	readonly createdAt: Date
	readonly outcomeStatus: 'OPEN' | 'WON' | 'LOST' | 'ABANDONED'
	readonly idLeadFunnelColumn: number
	/** CRM pipeline name. */
	readonly originTag?: string | null
	readonly idBusiness?: number | null
}

export interface CommercialBusinessInput {
	readonly idBusiness: number
	readonly status: string | null
	readonly createdAt?: Date
	/** Funding date ("Fecha de Fondeo"). */
	readonly dateAnchored?: Date | null
	readonly value?: number
	/** Currency symbol: COP or USD. */
	readonly currency?: string | null
}

export interface CommercialStageEventInput {
	readonly idLead: number
	readonly toColumnId: number
	readonly occurredAt: Date
}

export interface CommercialColumnInput {
	readonly idLeadFunnelColumn: number
	readonly name: string
	readonly externalStatusKey: string
	readonly position: number
}

export interface CommercialOwnerInput {
	readonly idUser: number
	readonly name: string
}

export interface CommercialStuckInput {
	readonly idLead: number
	readonly idUser: number | null
	readonly name: string
	readonly idLeadFunnelColumn: number
	readonly updatedAt: Date
}
