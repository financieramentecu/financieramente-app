import { UserRole } from '@/features/auth/lib/roles'

type ScopeSession = {
	readonly user?: {
		readonly id?: string | null
		readonly role?: string | null
	} | null
}

/**
 * Server-side scope for dashboard endpoints that trust a client-supplied
 * `userIds` list. A PARTNER may only ever see their own businesses, so the
 * requested ids are replaced by the session user id (fail closed when the id
 * is missing or invalid). An empty request stays empty so the endpoint keeps
 * its "no ids -> zeros" short-circuit. Other roles are returned untouched.
 */
export function scopeUserIdsToSession(
	session: ScopeSession,
	requestedUserIds: number[]
): number[] {
	if (session.user?.role !== UserRole.PARTNER) return requestedUserIds
	if (requestedUserIds.length === 0) return []

	const selfId = Number(session.user.id)
	return Number.isInteger(selfId) && selfId > 0 ? [selfId] : []
}
