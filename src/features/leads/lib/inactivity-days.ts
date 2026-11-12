import type { LeadOutcomeStatus } from '@prisma/client'

export const DEFAULT_INACTIVITY_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** `CRM_INACTIVITY_DAYS` as a positive integer, default 7. */
export function resolveInactivityThreshold(value: string | undefined = process.env.CRM_INACTIVITY_DAYS): number {
	const parsed = Number.parseInt(value ?? '', 10)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_INACTIVITY_DAYS
}

/**
 * Whole days an OPEN lead has gone without CRM activity, or null when it is
 * closed or still within the threshold (Odoo "rotting" indicator).
 */
export function getInactivityDays(
	lead: { outcomeStatus: LeadOutcomeStatus; lastActivityAt: Date | null; createdAt: Date },
	now: Date,
	threshold: number
): number | null {
	if (lead.outcomeStatus !== 'OPEN') return null
	const since = lead.lastActivityAt ?? lead.createdAt
	const days = Math.floor((now.getTime() - since.getTime()) / DAY_MS)
	return days >= threshold ? days : null
}
