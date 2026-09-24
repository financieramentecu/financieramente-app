import type { LeadOutcomeStatus } from '@prisma/client'

export type ParseLeadOutcomeStatusResult =
	| { rejected: false; value: LeadOutcomeStatus }
	| { rejected: true; reason: string }

const RECOGNIZED_TOKENS: readonly LeadOutcomeStatus[] = ['OPEN', 'WON', 'LOST', 'ABANDONED']

/**
 * Pure strict `estado` parser for the CSV import path. Case-insensitive
 * matching against exactly the 4 accepted tokens; anything else is rejected
 * with a reason naming the raw value. Unlike the CRM webhook's
 * `resolveOutcomeStatus`, this NEVER defaults an unrecognized value to
 * `OPEN` — a row that fails here is rejected outright by the caller, never
 * imported.
 */
export function parseLeadOutcomeStatus(raw: string): ParseLeadOutcomeStatusResult {
	const normalized = raw.trim().toUpperCase() as LeadOutcomeStatus

	if (RECOGNIZED_TOKENS.includes(normalized)) {
		return { rejected: false, value: normalized }
	}

	return {
		rejected: true,
		reason: `estado "${raw}" no reconocido. Valores válidos: open, won, lost, abandoned`,
	}
}
