import { roleScope } from '@/features/access-control/services/role-permission-check'

type ScopeSession = {
	readonly user?: {
		readonly id?: string | null
		readonly role?: string | null
	} | null
}

/**
 * Server-side scope for dashboard endpoints that trust a client-supplied
 * `userIds` list. A role with OWN scope (a PARTNER) may only ever see their own businesses, so the
 * requested ids are replaced by the session user id (fail closed when the id
 * is missing or invalid). An empty request stays empty so the endpoint keeps
 * its "no ids -> zeros" short-circuit. Roles without the grant get nothing; other scopes are returned untouched.
 */
export async function scopeUserIdsToSession(
	session: ScopeSession,
	requestedUserIds: number[]
): Promise<number[]> {
	const scope = await roleScope(session.user?.role, 'dashboard.ver')
	// No dashboard.ver grant at all: fail closed instead of trusting the client.
	if (!scope) return []
	if (scope !== 'OWN') return requestedUserIds
	if (requestedUserIds.length === 0) return []

	const selfId = Number(session.user?.id)
	return Number.isInteger(selfId) && selfId > 0 ? [selfId] : []
}
