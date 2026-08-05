import type { Lead, LeadFunnelColumn, LeadOutcomeStatus } from '@prisma/client'

/**
 * Domain types for the Leads feature.
 * `Lead` and `LeadFunnelColumn` are the Prisma models (re-exported for convenience).
 */
export type { Lead, LeadFunnelColumn, LeadOutcomeStatus }

/**
 * Fixed 4-value domain of `Lead.outcomeStatus` (D11). `WON` is terminal —
 * see `resolveOutcomeStatus()` in `lib/lead-outcome-status.ts`.
 */
export const LEAD_OUTCOME_STATUS_VALUES: readonly LeadOutcomeStatus[] = [
	'OPEN',
	'WON',
	'LOST',
	'ABANDONED',
]

/**
 * A single Kanban column with its leads, as returned by the board endpoint.
 */
export interface LeadBoardColumn {
	idLeadFunnelColumn: number
	name: string
	position: number
	isFallback: boolean
	leads: LeadCard[]
}

/**
 * Minimal projection of a `Lead` rendered on a Kanban card.
 */
export interface LeadCard {
	idLead: number
	name: string | null
	lastName: string | null
	email: string | null
	phone: string | null
	originTag: string | null
	idUser: number | null
	ownerName: string | null
	outcomeStatus: LeadOutcomeStatus
}

/**
 * Full detail projection of a `Lead`, including conversion state.
 */
export interface LeadDetail {
	idLead: number
	externalCrmId: string | null
	name: string | null
	lastName: string | null
	email: string | null
	phone: string | null
	identityNumber: string | null
	originTag: string | null
	externalUrl: string | null
	idUser: number | null
	ownerName: string | null
	idLeadFunnelColumn: number
	idBusiness: number | null
	outcomeStatus: LeadOutcomeStatus
	createdAt: Date
	updatedAt: Date
}

/**
 * Viewer context used for hierarchy-scoped visibility checks.
 */
export interface LeadViewer {
	idUser: number
	role?: { code: string } | null
}
