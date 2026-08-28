import type { PrismaClient } from '@prisma/client'
import { isGlobalVisibilityRole } from '@/features/auth/lib/roles'

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

/**
 * Resolves the hierarchical visibility scope for the business list/export endpoints.
 * - Global-visibility roles (write-bypass ADMIN-like roles + read-only CONSULTOR)
 *   → `undefined` (no `idUser` filter — sees all businesses).
 * - Every other role → `[self, ...subordinates]` (hierarchical subtree only).
 *
 * Shared by `GET /api/negocios` and `POST /api/negocios/export` so both endpoints
 * apply the exact same visibility rule (see spec "Export Rows Scoped to Hierarchy
 * Subtree (Bug Fix)"). Visibility here is orthogonal to write authority — see
 * `isGlobalVisibilityRole` in `roles.ts`.
 */
export async function resolveVisibleUserIds(
	prisma: Pick<PrismaClient, 'user'>,
	currentUser: { idUser: number; role?: { code: string } | null }
): Promise<number[] | undefined> {
	if (isGlobalVisibilityRole(currentUser.role?.code)) return undefined

	const subordinates = await getSubordinateUserIds(prisma, currentUser.idUser)
	return [currentUser.idUser, ...subordinates]
}
