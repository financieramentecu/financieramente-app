import { prisma } from '@/lib/prisma'
import type { Client } from '@prisma/client'

/**
 * Input for `resolveExistingClient` (D1/D5/D7). Mirrors the identity data
 * captured on the business-creation form for a lead conversion.
 */
export interface ResolveClientCriteria {
	/** Mirrors `createClient`'s hardcoded default (`'CC'`). */
	typeIdentity: string
	identityNumber: string
	email?: string | null
	/** D7: enables the inactive-document reactivation fallback. Lead conversion only. */
	allowReactivation: boolean
}

/** How the client was resolved — drives the D5 alert and the D7 audit entry. */
export type ClientResolutionSource = 'document' | 'email' | 'reactivated'

export interface ClientResolution {
	client: Client
	source: ClientResolutionSource
}

/**
 * Resolves an existing `Client` before a lead-conversion business is
 * created, following the D1/D5/D7 data flow:
 *
 * 1. Exact `typeIdentity` + `identityNumber`, `active: true` → `'document'`.
 * 2. Else exact `email`, `active: true`, exactly one match → `'email'`.
 *    (0 or 2+ matches never reuse a client — see D5.)
 * 3. Else, only when `allowReactivation` is true, exact `typeIdentity` +
 *    `identityNumber` with `active: false` → reactivate (`active: true`)
 *    and reuse → `'reactivated'`.
 * 4. Else `null` — caller falls through to `createClient` unchanged.
 *
 * An inactive `Client` is NEVER a silent match via steps 1-2 (D1) — it can
 * only surface through the explicit D7 reactivation fallback.
 */
export async function resolveExistingClient(
	criteria: ResolveClientCriteria
): Promise<ClientResolution | null> {
	const { typeIdentity, identityNumber, email, allowReactivation } = criteria

	const documentMatch = await prisma.client.findFirst({
		where: { typeIdentity, identityNumber, active: true },
	})

	if (documentMatch) {
		return { client: documentMatch, source: 'document' }
	}

	if (email) {
		const emailMatches = await prisma.client.findMany({
			where: { email, active: true },
			take: 2,
		})

		if (emailMatches.length === 1) {
			return { client: emailMatches[0], source: 'email' }
		}
	}

	if (!allowReactivation) {
		return null
	}

	const inactiveDocumentMatch = await prisma.client.findFirst({
		where: { typeIdentity, identityNumber, active: false },
	})

	if (!inactiveDocumentMatch) {
		return null
	}

	const reactivatedClient = await prisma.client.update({
		where: { idClient: inactiveDocumentMatch.idClient },
		data: { active: true },
	})

	return { client: reactivatedClient, source: 'reactivated' }
}
