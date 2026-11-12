import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '@/lib/prisma'
import { UserRole, isGlobalVisibilityRole } from '@/features/auth/lib/roles'
import { getSubordinateUserIds as getTeamSubordinateUserIds } from '@/features/access-control/services/team-hierarchy.service'

/**
 * Subordinate ids of a user (hierarchy subtree, root excluded).
 * Single implementation lives in access-control; kept here so existing
 * importers keep working until the role checks are migrated.
 */
export const getSubordinateUserIds = getTeamSubordinateUserIds

export interface VisibilityOptions {
	/**
	 * Narrow AGENTE to their own rows (no subordinates). Used by rules that are
	 * owner-only (PUT /api/negocios/[id]). Global roles are unaffected.
	 */
	ownOnly?: boolean
}

/**
 * SINGLE visibility rule shared by the business list/export/stats endpoints
 * and the per-business access decision (`resolveBusinessScope`):
 * - Global-visibility roles (write-bypass ADMIN-like roles + read-only CONSULTOR)
 *   -> `undefined` (no `idUser` filter, sees every business).
 * - AGENTE -> `[self, ...subordinates]` (hierarchy subtree; `[self]` with `ownOnly`).
 * - PARTNER -> `[self]` only, never a hierarchy lookup.
 * - Anything else (DEFAULT, unknown, missing role) -> `[]` (fails closed).
 *
 * Visibility is orthogonal to write authority - see `isGlobalVisibilityRole`
 * in `roles.ts`.
 */
export async function resolveVisibleUserIds(
	prisma: Pick<PrismaClient, 'user'>,
	currentUser: { idUser: number; role?: { code: string } | null },
	options: VisibilityOptions = {}
): Promise<number[] | undefined> {
	const roleCode = currentUser.role?.code

	if (isGlobalVisibilityRole(roleCode)) return undefined
	if (roleCode === UserRole.PARTNER) return [currentUser.idUser]
	if (roleCode === UserRole.AGENTE) {
		if (options.ownOnly) return [currentUser.idUser]
		const subordinates = await getSubordinateUserIds(prisma, currentUser.idUser)
		return [currentUser.idUser, ...subordinates]
	}
	return []
}

/**
 * Same rule as `resolveVisibleUserIds`, using the shared Prisma client, for
 * HTTP handlers that must not touch the client themselves.
 */
export function resolveVisibleUserIdsForUser(currentUser: {
	idUser: number
	role?: { code: string } | null
}): Promise<number[] | undefined> {
	return resolveVisibleUserIds(sharedPrisma, currentUser)
}
