import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { SessionUser } from '@/features/shared/types/session-user.types'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const LEVELS = [
	{ idLevel: 1, code: 'GENERAL_LEVEL', name: 'MIA', color: '#111111', status: true, idNextLevel: 2, beneficiaryMode: 'OVERRIDE' },
	{ idLevel: 2, code: 'TEAM_LEADER', name: 'Team Leader', color: '#222222', status: true, idNextLevel: 3, beneficiaryMode: 'OVERRIDE' },
	{ idLevel: 3, code: 'MS_SENIOR', name: 'MS Senior', color: '#333333', status: true, idNextLevel: 4, beneficiaryMode: 'OVERRIDE' },
	{ idLevel: 4, code: 'MS_JUNIOR', name: 'MS Junior', color: '#444444', status: true, idNextLevel: null, beneficiaryMode: 'OVERRIDE' },
]

const ACTIVE_USERS = [
	{ idUser: 1, name: 'Maria', lastName: 'MIA', idLevel: 1, idCategory: 10, idUserLeader: null, category: { name: 'Categoría A' } },
	{ idUser: 2, name: 'Team', lastName: 'Leader', idLevel: 2, idCategory: 11, idUserLeader: 1, category: { name: 'Categoría B' } },
	{ idUser: 3, name: 'MS', lastName: 'Senior', idLevel: 3, idCategory: 12, idUserLeader: 2, category: { name: 'Categoría C' } },
	{ idUser: 4, name: 'MS', lastName: 'Junior One', idLevel: 4, idCategory: 13, idUserLeader: 3, category: { name: 'Categoría D' } },
	{ idUser: 5, name: 'MS', lastName: 'Junior Two', idLevel: 4, idCategory: 13, idUserLeader: 3, category: { name: 'Categoría D' } },
]

const miaViewer: SessionUser = {
	idUser: 1,
	name: 'Maria',
	lastName: 'MIA',
	email: 'mia@test.com',
	active: true,
	idLevel: 1,
	idCategory: null,
	idUserLeader: null,
	role: { code: 'DEFAULT' },
	level: { code: 'GENERAL_LEVEL' },
}

const teamLeaderViewer: SessionUser = {
	idUser: 2,
	name: 'Team',
	lastName: 'Leader',
	email: 'tl@test.com',
	active: true,
	idLevel: 2,
	idCategory: null,
	idUserLeader: 1,
	role: { code: 'DEFAULT' },
	level: { code: 'TEAM_LEADER' },
}

const msSeniorViewer: SessionUser = {
	idUser: 3,
	name: 'MS',
	lastName: 'Senior',
	email: 'ms@test.com',
	active: true,
	idLevel: 3,
	idCategory: null,
	idUserLeader: 2,
	role: { code: 'DEFAULT' },
	level: { code: 'MS_SENIOR' },
}

const adminViewer: SessionUser = {
	idUser: 99,
	name: 'Admin',
	lastName: 'User',
	email: 'admin@test.com',
	active: true,
	idLevel: null,
	idCategory: null,
	idUserLeader: null,
	role: { code: 'ADMIN' },
	level: null,
}

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------

function makeMockPrisma(users: unknown[], levels = LEVELS) {
	return {
		user: {
			findMany: vi.fn().mockResolvedValue(users),
		},
		level: {
			findMany: vi.fn().mockResolvedValue(levels),
		},
	} as unknown as PrismaClient
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectUserIds(nodes: Awaited<ReturnType<typeof buildHierarchyTree>>): number[] {
	const ids: number[] = []
	function walk(ns: typeof nodes) {
		for (const n of ns) {
			ids.push(n.userId)
			walk(n.children)
		}
	}
	walk(nodes)
	return ids
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildHierarchyTree', () => {
	it('(a) MIA viewer — level.code GENERAL_LEVEL — receives all root nodes (users with no leader)', async () => {
		const prisma = makeMockPrisma(ACTIVE_USERS)
		const result = await buildHierarchyTree(miaViewer, prisma)

		// Only one user has idUserLeader = null: idUser 1 (MIA herself)
		expect(result).toHaveLength(1)
		expect(result[0].userId).toBe(1)
		// Full tree reachable from root
		const ids = collectUserIds(result)
		expect(ids).toContain(1)
		expect(ids).toContain(2)
		expect(ids).toContain(3)
		expect(ids).toContain(4)
		expect(ids).toContain(5)
	})

	it('(b) Team Leader viewer — receives only own subtree (self + descendants)', async () => {
		const prisma = makeMockPrisma(ACTIVE_USERS)
		const result = await buildHierarchyTree(teamLeaderViewer, prisma)

		const ids = collectUserIds(result)
		// Team Leader is root of their own subtree
		expect(ids).toContain(2)
		// Their descendants are present
		expect(ids).toContain(3)
		expect(ids).toContain(4)
		expect(ids).toContain(5)
		// MIA (parent/peer) is NOT included
		expect(ids).not.toContain(1)
	})

	it('(c) MS Senior viewer — receives own subtree containing only MS Junior children', async () => {
		const prisma = makeMockPrisma(ACTIVE_USERS)
		const result = await buildHierarchyTree(msSeniorViewer, prisma)

		const ids = collectUserIds(result)
		expect(ids).toContain(3) // MS Senior herself
		expect(ids).toContain(4) // MS Junior One
		expect(ids).toContain(5) // MS Junior Two
		// Superiors not included
		expect(ids).not.toContain(1)
		expect(ids).not.toContain(2)
	})

	it('(d) Inactive users (active: false) are excluded from the tree', async () => {
		// findMany with where: { active: true } will not return inactive users;
		// we simulate the DB filter by including only active users in the mock result
		const activeOnly = ACTIVE_USERS.filter((u) => u.idUser !== 4) // pretend 4 is inactive
		const prisma = makeMockPrisma(activeOnly)
		const result = await buildHierarchyTree(miaViewer, prisma)

		const ids = collectUserIds(result)
		expect(ids).not.toContain(4)
		// Other active users still present
		expect(ids).toContain(3)
		expect(ids).toContain(5)
	})

	it('(e) BFS cycle guard — self-referential user (idUserLeader = self) terminates without infinite loop', async () => {
		// cycleUser 7 points to itself as leader
		const usersWithCycle = [
			...ACTIVE_USERS,
			{ idUser: 7, name: 'Cycle', lastName: 'Self', idLevel: 4, idCategory: null, idUserLeader: 7, category: null },
		]
		// MIA viewer so cycle user is reachable (but cycle must terminate)
		const prisma = makeMockPrisma(usersWithCycle)

		// Should resolve without hanging or throwing
		await expect(buildHierarchyTree(miaViewer, prisma)).resolves.toBeDefined()
	})

	it('(f) Dynamic depth — new Level in chain appears in tree without code change', async () => {
		const deepLevels = [
			...LEVELS,
			{ idLevel: 5, code: 'LEVEL_5', name: 'Level Five', color: '#555555', status: true, idNextLevel: null, beneficiaryMode: 'OVERRIDE' },
		]
		const deepUsers = [
			...ACTIVE_USERS,
			{ idUser: 6, name: 'Deep', lastName: 'User', idLevel: 5, idCategory: null, idUserLeader: 4, category: null },
		]
		const prisma = makeMockPrisma(deepUsers, deepLevels)
		const result = await buildHierarchyTree(miaViewer, prisma)

		const ids = collectUserIds(result)
		expect(ids).toContain(6)

		function findNode(nodes: typeof result, userId: number): (typeof result)[number] | undefined {
			for (const n of nodes) {
				if (n.userId === userId) return n
				const found = findNode(n.children, userId)
				if (found) return found
			}
			return undefined
		}
		const deepNode = findNode(result, 6)
		expect(deepNode?.levelCode).toBe('LEVEL_5')
		expect(deepNode?.levelColor).toBe('#555555')
	})

	it('(g) HIERARCHY_BYPASS_ROLES viewer (ADMIN) — receives full tree same as MIA', async () => {
		const prisma = makeMockPrisma(ACTIVE_USERS)
		const adminResult = await buildHierarchyTree(adminViewer, prisma)

		const miaResult = await buildHierarchyTree(miaViewer, makeMockPrisma(ACTIVE_USERS))

		const adminIds = collectUserIds(adminResult).sort()
		const miaIds = collectUserIds(miaResult).sort()

		expect(adminIds).toEqual(miaIds)
	})

	it('(h) Users without idLevel assigned are excluded from the tree', async () => {
		const usersWithUnleveled = [
			...ACTIVE_USERS,
			{ idUser: 10, name: 'Sin', lastName: 'Nivel', idLevel: null, idCategory: null, idUserLeader: 2, category: null },
			{ idUser: 11, name: 'Otro', lastName: 'Sin Nivel', idLevel: null, idCategory: null, idUserLeader: null, category: null },
		]
		const prisma = makeMockPrisma(usersWithUnleveled)
		const result = await buildHierarchyTree(miaViewer, prisma)

		const ids = collectUserIds(result)
		expect(ids).not.toContain(10)
		expect(ids).not.toContain(11)
		// Normal users still present
		expect(ids).toContain(1)
		expect(ids).toContain(2)
	})

	it('(i) Each node exposes categoryName from User.category.name (empty string when no category)', async () => {
		const usersWithMixedCategory = [
			...ACTIVE_USERS,
			{ idUser: 20, name: 'Sin', lastName: 'Categoria', idLevel: 4, idCategory: null, idUserLeader: 3, category: null },
		]
		const prisma = makeMockPrisma(usersWithMixedCategory)
		const result = await buildHierarchyTree(miaViewer, prisma)

		function findNode(nodes: typeof result, userId: number): (typeof result)[number] | undefined {
			for (const n of nodes) {
				if (n.userId === userId) return n
				const found = findNode(n.children, userId)
				if (found) return found
			}
			return undefined
		}

		// User with category assigned
		const nodeWithCategory = findNode(result, 1)
		expect(nodeWithCategory?.categoryName).toBe('Categoría A')

		// User without category → empty string (not null/undefined)
		const nodeWithoutCategory = findNode(result, 20)
		expect(nodeWithoutCategory?.categoryName).toBe('')
	})

	it('each node has included: true by default', async () => {
		const prisma = makeMockPrisma(ACTIVE_USERS)
		const result = await buildHierarchyTree(miaViewer, prisma)

		function allIncluded(nodes: typeof result): boolean {
			return nodes.every((n) => n.included === true && allIncluded(n.children))
		}
		expect(allIncluded(result)).toBe(true)
	})
})
