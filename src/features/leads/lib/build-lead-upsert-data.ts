import type { Prisma, LeadOutcomeStatus } from '@prisma/client'
import type { CrmSyncPayload } from '@/features/leads/types/crm-sync.schema'

export interface StoredLeadContactFields {
	name?: string | null
	lastName?: string | null
	email?: string | null
	phone?: string | null
	identityNumber?: string | null
	originTag?: string | null
	externalUrl?: string | null
}

const OPTIONAL_STRING_FIELDS = [
	'name',
	'lastName',
	'email',
	'phone',
	'identityNumber',
	'originTag',
	'externalUrl',
] as const

/**
 * Pure partial-merge builder for the CRM sync upsert payload.
 *
 * Absent (`undefined`) or empty-after-trim optional fields never overwrite a
 * previously stored non-empty value — the merge decision is made per field,
 * without touching the database, so it stays unit-testable.
 *
 * Owner resolution follows the same "omit means preserve" rule but is
 * computed upstream (`resolveOwner()` in `lead-sync.service`) since it
 * requires a `User` lookup: `resolvedOwnerId === undefined` means the
 * payload's `ownerEmail` was absent/empty (existing owner preserved);
 * `null` means it was present but matched no `User` (owner cleared);
 * a number means it resolved and MUST overwrite any existing owner
 * ("no sticky owner").
 *
 * `resolvedOutcomeStatus` follows the exact same "omit means preserve" rule,
 * computed upstream by `resolveOutcomeStatus()` (`current`/lock-aware, see
 * design D13/D19-D23): `undefined` omits the key entirely (stored value
 * preserved, or `@default(OPEN)` on create); any defined enum value is
 * written as-is. This builder stays a dumb merger — the `WON` lock lives
 * entirely in `resolveOutcomeStatus()`, never here.
 */
export function buildLeadUpsertData(
	payload: CrmSyncPayload,
	_storedLead: StoredLeadContactFields,
	resolvedOwnerId?: number | null,
	resolvedOutcomeStatus?: LeadOutcomeStatus
): Prisma.LeadUncheckedCreateInput & Prisma.LeadUncheckedUpdateInput {
	const data: Record<string, unknown> = {
		externalCrmId: payload.externalCrmId,
	}

	for (const field of OPTIONAL_STRING_FIELDS) {
		const incomingValue = payload[field]
		if (incomingValue !== undefined && incomingValue.trim() !== '') {
			data[field] = incomingValue
		}
	}

	if (resolvedOwnerId !== undefined) {
		data.idUser = resolvedOwnerId
	}

	if (resolvedOutcomeStatus !== undefined) {
		data.outcomeStatus = resolvedOutcomeStatus
	}

	return data as Prisma.LeadUncheckedCreateInput &
		Prisma.LeadUncheckedUpdateInput
}
