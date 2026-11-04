import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '@/lib/prisma'
import { UserRole, isGlobalVisibilityRole } from '@/features/auth/lib/roles'

/**
 * BFS traversal over the User.idUserLeader chain to collect all subordinate IDs.
 * - Loads only active users ({ status: true }) with idUser + idUserLeader.
 * - Cycle-safe via a visited Set<number>.
 * - Root user is NOT included in the result.
 * - Returns empty array when no subordinates found.
 */
export async function getSubordinateUserIds(
	prisma: Pick<PrismaClient, 'user'>,
	rootIdUser: number
): Promise<number[]> {
	const users = await prisma.user.findMany({
		where: { active: true },
		select: { idUser: true, idUserLeader: true },
	})

	// Build adjacency list: leader → direct reports
	const children = new Map<number, number[]>()
	for (const u of users) {
		if (u.idUserLeader === null) continue
		const existing = children.get(u.idUserLeader) ?? []
		existing.push(u.idUser)
		children.set(u.idUserLeader, existing)
	}

	// BFS from root
	const visited = new Set<number>([rootIdUser])
	const queue: number[] = [rootIdUser]
	const subordinates: number[] = []

	while (queue.length > 0) {
		const current = queue.shift()!
		const directReports = children.get(current) ?? []
		for (const child of directReports) {
			if (visited.has(child)) continue
			visited.add(child)
			subordinates.push(child)
			queue.push(child)
		}
	}

	return subordinates
}

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
