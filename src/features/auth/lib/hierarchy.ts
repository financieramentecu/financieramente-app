/**
 * Hierarchy-based access control helpers for commission distribution visibility.
 *
 * The user hierarchy is encoded on {@link User.idUserLeader}: each user can have
 * a single leader, which yields a tree structure (coach → líder → gerente → …).
 * A viewer sees their own distributions plus those of any user downstream from
 * them in the tree.
 *
 * Backoffice roles (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE) are
 * considered omniscient and bypass the hierarchy lookup.
 */

import { prisma } from '@/lib/prisma'
import { UserRole } from './roles'

/**
 * Roles that can view every user's distributions regardless of hierarchy.
 * Kept readonly so callers can't mutate the allow-list.
 */
export const HIERARCHY_BYPASS_ROLES: ReadonlyArray<UserRole> = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * Returns true when the given role bypasses hierarchy restrictions.
 */
export function isHierarchyBypassRole(
	role: UserRole | string | null | undefined
): boolean {
	if (!role) return false
	return HIERARCHY_BYPASS_ROLES.includes(role as UserRole)
}

interface RawUserId {
	id_user: number
}

/**
 * Returns the set of user ids that `viewerId` is allowed to see distributions
 * for. Always includes `viewerId` itself; recursively adds all descendants
 * (subordinates-of-subordinates) via {@link User.idUserLeader}.
 *
 * Uses a Postgres recursive CTE with an explicit depth guard so pathological
 * cycles in the data cannot cause an infinite loop. Results are deduplicated
 * and returned as a plain array sorted ascending.
 */
export async function getAccessibleUserIds(
	viewerId: number
): Promise<number[]> {
	if (!Number.isFinite(viewerId) || viewerId <= 0) return []

	const rows = await prisma.$queryRaw<RawUserId[]>`
		WITH RECURSIVE descendants AS (
			SELECT id_user, 0 AS depth
			FROM "public"."user"
			WHERE id_user = ${viewerId}
			UNION ALL
			SELECT u.id_user, d.depth + 1
			FROM "public"."user" u
			INNER JOIN descendants d ON u.id_user_leader = d.id_user
			WHERE d.depth < 32
		)
		SELECT DISTINCT id_user FROM descendants ORDER BY id_user ASC
	`

	return rows.map((r) => r.id_user)
}

/**
 * Returns true when `viewerId` is allowed to view `targetUserId`'s
 * distributions, considering role-based bypass plus hierarchy descent.
 *
 * - Anyone may view their own distributions.
 * - Bypass roles (see {@link HIERARCHY_BYPASS_ROLES}) see everybody.
 * - Otherwise, `targetUserId` must be a descendant of `viewerId`.
 */
export async function canViewUserDistributions(
	viewerId: number,
	targetUserId: number,
	viewerRole?: UserRole | string | null
): Promise<boolean> {
	if (!Number.isFinite(viewerId) || viewerId <= 0) return false
	if (!Number.isFinite(targetUserId) || targetUserId <= 0) return false

	if (viewerId === targetUserId) return true
	if (isHierarchyBypassRole(viewerRole)) return true

	const accessible = await getAccessibleUserIds(viewerId)
	return accessible.includes(targetUserId)
}
