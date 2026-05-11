import type { PrismaClient } from '@prisma/client'

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
