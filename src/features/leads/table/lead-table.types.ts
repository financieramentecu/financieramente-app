import type { LeadOutcomeStatus } from '@prisma/client'

export interface LeadTagChip {
	idLeadTag: number
	name: string
	color: string
}

/** One row of the CRM lead table. Amounts are decimal strings; dates are ISO strings. */
export interface LeadTableRow {
	idLead: number
	name: string | null
	lastName: string | null
	email: string | null
	phone: string | null
	originTag: string | null
	idUser: number | null
	ownerName: string | null
	idLeadFunnelColumn: number
	stageName: string
	outcomeStatus: LeadOutcomeStatus
	estimatedValue: string | null
	probability: number | null
	weightedValue: string | null
	tags: LeadTagChip[]
	createdAt: string
	lastActivityAt: string | null
	inactiveDays: number | null
}

export interface LeadTableTotals {
	/** Null when the filtered set is larger than the totals cap. */
	estimatedValue: string | null
	weightedValue: string | null
}

export interface LeadTablePage {
	items: LeadTableRow[]
	total: number
	page: number
	pageSize: number
	totals: LeadTableTotals
}
