import type { PrismaClient } from '@prisma/client'

/** Alineado a cadena ascendente en liquidación (evita imports cruzados al feature). */
export const LEADER_CHAIN_MAX_DEPTH = 50

export interface LeaderExportLevel {
	fullName: string
	categoryName: string | null
}

/**
 * Cadena de líderes por encima del coach (no incluye al coach).
 * Cache por `coachUserId` intra-request.
 */
export async function resolveLeaderChainForExport(
	db: Pick<PrismaClient, 'user'>,
	coachUserId: number,
	cache: Map<number, LeaderExportLevel[]>
): Promise<LeaderExportLevel[]> {
	const cached = cache.get(coachUserId)
	if (cached) {
		return cached
	}

	const coach = await db.user.findUnique({
		where: { idUser: coachUserId },
		select: { idUserLeader: true },
	})

	let currentId: number | null = coach?.idUserLeader ?? null
	const levels: LeaderExportLevel[] = []
	const visited = new Set<number>()

	for (
		let depth = 0;
		depth < LEADER_CHAIN_MAX_DEPTH && currentId != null;
		depth++
	) {
		if (visited.has(currentId)) {
			break
		}
		visited.add(currentId)

		const row = await db.user.findUnique({
			where: { idUser: currentId },
			select: {
				idUser: true,
				name: true,
				lastName: true,
				idUserLeader: true,
				category: { select: { name: true } },
			},
		})

		if (!row) {
			break
		}

		const fullName = [row.name, row.lastName].filter(Boolean).join(' ').trim()
		levels.push({
			fullName,
			categoryName: row.category?.name ?? null,
		})

		currentId = row.idUserLeader
	}

	cache.set(coachUserId, levels)
	return levels
}
