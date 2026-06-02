import type { PrismaClient } from '@prisma/client'
import type { SessionUser } from '@/features/shared/types/session-user.types'
import type { HierarchyNode } from '@/features/production-dashboard/types/hierarchy.types'
import { HIERARCHY_BYPASS_ROLES } from '@/features/auth/lib/hierarchy'

type UserRow = {
	idUser: number
	idUserLeader: number | null
	name: string
	lastName: string | null
	idLevel: number | null
	idCategory: number | null
	category: { name: string } | null
}

type LevelRow = {
	idLevel: number
	code: string
	name: string
	color: string
	idNextLevel: number | null
	beneficiaryMode: string
}

function isFullTreeViewer(viewer: SessionUser): boolean {
	if (viewer.level?.code === 'GENERAL_LEVEL') return true
	if (!viewer.role) return false
	return (HIERARCHY_BYPASS_ROLES as ReadonlyArray<string>).includes(viewer.role.code)
}

function buildNode(
	userId: number,
	userMap: Map<number, UserRow>,
	levelMap: Map<number, Pick<LevelRow, 'code' | 'color'>>,
	childrenMap: Map<number, number[]>,
	visited: Set<number>
): HierarchyNode | null {
	const user = userMap.get(userId)
	if (!user) return null

	const level = user.idLevel !== null ? levelMap.get(user.idLevel) : undefined
	const childIds = childrenMap.get(userId) ?? []
	const children: HierarchyNode[] = []

	for (const childId of childIds) {
		if (visited.has(childId)) continue
		visited.add(childId)
		const child = buildNode(childId, userMap, levelMap, childrenMap, visited)
		if (child) children.push(child)
	}

	return {
		userId: user.idUser,
		fullName: user.lastName ? `${user.name} ${user.lastName}` : user.name,
		levelCode: level?.code ?? '',
		levelColor: level?.color ?? '#003c45',
		categoryName: user.category?.name ?? '',
		idCategory: user.idCategory,
		included: true,
		children,
	}
}

export async function buildHierarchyTree(
	viewer: SessionUser,
	prisma: Pick<PrismaClient, 'user' | 'level'>
): Promise<HierarchyNode[]> {
	const [users, levels] = await Promise.all([
		prisma.user.findMany({
			where: { active: true, idLevel: { not: null } },
			select: {
				idUser: true,
				idUserLeader: true,
				name: true,
				lastName: true,
				idLevel: true,
				idCategory: true,
				category: { select: { name: true } },
			},
		}) as unknown as Promise<UserRow[]>,
		prisma.level.findMany({
			where: { status: true },
			select: {
				idLevel: true,
				code: true,
				name: true,
				color: true,
				idNextLevel: true,
				beneficiaryMode: true,
			},
		}) as unknown as Promise<LevelRow[]>,
	])

	const levelMap = new Map<number, Pick<LevelRow, 'code' | 'color'>>()
	const overrideLevelIds = new Set<number>()
	for (const level of levels) {
		levelMap.set(level.idLevel, { code: level.code, color: level.color })
		if (level.beneficiaryMode === 'OVERRIDE') overrideLevelIds.add(level.idLevel)
	}

	// Only include users with an assigned level of type OVERRIDE (exclude BENEFICIARIO_GENERAL)
	const eligibleUsers = users.filter(
		(u) => u.idLevel !== null && overrideLevelIds.has(u.idLevel)
	)

	const userMap = new Map<number, UserRow>()
	for (const user of eligibleUsers) {
		userMap.set(user.idUser, user)
	}

	const childrenMap = new Map<number, number[]>()
	for (const user of eligibleUsers) {
		if (user.idUserLeader === null) continue
		const existing = childrenMap.get(user.idUserLeader) ?? []
		existing.push(user.idUser)
		childrenMap.set(user.idUserLeader, existing)
	}

	const fullTree = isFullTreeViewer(viewer)
	const rootIds = fullTree
		? eligibleUsers
				.filter((u) => u.idUserLeader === null)
				.sort((a, b) => (a.idLevel ?? Infinity) - (b.idLevel ?? Infinity))
				.map((u) => u.idUser)
		: [viewer.idUser]

	const visited = new Set<number>()
	const result: HierarchyNode[] = []

	for (const rootId of rootIds) {
		if (visited.has(rootId)) continue
		visited.add(rootId)
		const node = buildNode(rootId, userMap, levelMap, childrenMap, visited)
		if (node) result.push(node)
	}

	return result
}
