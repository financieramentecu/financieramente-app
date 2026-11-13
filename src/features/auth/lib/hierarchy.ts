/**
 * Hierarchy-based access control helpers for commission distribution visibility.
 *
 * The user hierarchy is encoded on {@link User.idUserLeader}: each user can have
 * a single leader, which yields a tree structure (coach → líder → gerente → …).
 * A viewer sees their own distributions plus those of any user downstream from
 * them in the tree.
 *
 * Roles whose `distribuciones.ver` scope is COMPANY see everybody and skip the
 * hierarchy lookup.
 */

import { prisma } from '@/lib/prisma'
import type { UserRole } from './roles'
import { roleScope } from '@/features/access-control/services/role-permission-check'

/**
 * Whether the role sees every user's distributions: the COMPANY scope of
 * `distribuciones.ver` (ADMIN-like roles and the read-only CONSULTOR by default).
 */
export async function canSeeAllDistributions(
	role: UserRole | string | null | undefined
): Promise<boolean> {
	return (await roleScope(role, 'distribuciones.ver')) === 'COMPANY'
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
 * - Roles with COMPANY scope (see {@link canSeeAllDistributions}) see everybody.
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
	if (await canSeeAllDistributions(viewerRole)) return true

	const accessible = await getAccessibleUserIds(viewerId)
	return accessible.includes(targetUserId)
}
