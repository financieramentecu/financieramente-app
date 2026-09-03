import type { LeadOutcomeStatus } from '@prisma/client'

/**
 * Pure eligibility predicate for admin lead deletion. A lead already linked
 * to a `Business`, or with a terminal `outcomeStatus` (`WON`/`LOST`/
 * `ABANDONED`), is never eligible. The single source of truth evaluated on
 * both client (cosmetic render gate) and server (authoritative guard).
 */
export function canDeleteLead(lead: {
	idBusiness: number | null
	outcomeStatus: LeadOutcomeStatus
}): boolean {
	return lead.idBusiness === null && lead.outcomeStatus === 'OPEN'
}
