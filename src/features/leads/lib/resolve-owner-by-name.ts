import { normalizePersonName } from '@/features/leads/lib/normalize-person-name'

export interface ActiveUserForNameMatch {
	idUser: number
	name: string
	lastName: string | null
}

export type ResolveOwnerByNameResult =
	| { status: 'matched'; idUser: number }
	| { status: 'unmatched' }
	| { status: 'ambiguous'; candidateCount: number }

/**
 * Pure exact, normalized full-name match for the `propietario_nombre`
 * owner-resolution fallback. Deliberately does NOT support `contains`,
 * prefix, or similarity matching — a partial name always falls through to
 * `unmatched` rather than guessing an owner. Two or more matches fail closed
 * as `ambiguous` instead of picking one.
 */
export function resolveOwnerByName(
	name: string,
	activeUsers: readonly ActiveUserForNameMatch[]
): ResolveOwnerByNameResult {
	const normalizedTarget = normalizePersonName(name)
	if (normalizedTarget === '') {
		return { status: 'unmatched' }
	}

	const candidates = activeUsers.filter(
		(user) => normalizePersonName(`${user.name} ${user.lastName ?? ''}`) === normalizedTarget
	)

	if (candidates.length === 0) {
		return { status: 'unmatched' }
	}

	if (candidates.length > 1) {
		return { status: 'ambiguous', candidateCount: candidates.length }
	}

	return { status: 'matched', idUser: candidates[0].idUser }
}
