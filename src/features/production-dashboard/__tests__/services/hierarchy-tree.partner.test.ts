import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { SessionUser } from '@/features/shared/types/session-user.types'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import {
	collectSelectedIds,
	toggleNodeInTree,
} from '@/features/production-dashboard/components/HierarchySelectionContext'

const LEVELS = [
	{
		idLevel: 1,
		code: 'LEVEL_3',
		name: 'L3',
		color: '#111',
		status: true,
		idNextLevel: null,
		beneficiaryMode: 'OVERRIDE',
	},
	{
		idLevel: 2,
		code: 'LEVEL_0',
		name: 'L0',
		color: '#222',
		status: true,
		idNextLevel: null,
		beneficiaryMode: 'OVERRIDE',
	},
	{
		idLevel: 9,
		code: 'PARTNER_EXTERNAL',
		name: 'Partner',
		color: '#999',
		status: true,
		idNextLevel: null,
		beneficiaryMode: 'OVERRIDE',
	},
]

const USERS = [
	{
		idUser: 1,
		name: 'Lea',
		lastName: 'Leader',
		idLevel: 1,
		idCategory: 1,
		idUserLeader: null,
		category: { name: 'Cat' },
	},
	{
		idUser: 2,
		name: 'Ana',
		lastName: 'Agent',
		idLevel: 2,
		idCategory: 1,
		idUserLeader: 1,
		category: { name: 'Cat' },
	},
	{
		idUser: 7,
		name: 'Pia',
		lastName: 'Partner',
		idLevel: 9,
		idCategory: 2,
		idUserLeader: 1,
		category: { name: 'Partner' },
	},
]

const leader: SessionUser = {
	idUser: 1,
	name: 'Lea',
	lastName: 'Leader',
	email: 'lea@test.com',
	active: true,
	idLevel: 1,
	idCategory: null,
	idUserLeader: null,
	role: { code: 'AGENTE' },
	level: { code: 'LEVEL_3' },
}

const prisma = {
	user: { findMany: vi.fn().mockResolvedValue(USERS) },
	level: { findMany: vi.fn().mockResolvedValue(LEVELS) },
} as unknown as PrismaClient

describe('hierarchy tree with a PARTNER_EXTERNAL partner (PD-02)', () => {
	it('hangs the partner under the leader next to the agents', async () => {
		const tree = await buildHierarchyTree(leader, prisma)

		expect(tree).toHaveLength(1)
		const childIds = tree[0].children.map((c) => c.userId)
		expect(childIds).toEqual(expect.arrayContaining([2, 7]))
		expect(tree[0].children.find((c) => c.userId === 7)?.levelCode).toBe(
			'PARTNER_EXTERNAL'
		)
	})

	it('deselecting and re-selecting the partner filters the selected ids like any node', async () => {
		const tree = await buildHierarchyTree(leader, prisma)
		expect(collectSelectedIds(tree).sort()).toEqual([1, 2, 7])

		const without = toggleNodeInTree(tree, 7)
		expect(collectSelectedIds(without).sort()).toEqual([1, 2])

		const withAgain = toggleNodeInTree(without, 7)
		expect(collectSelectedIds(withAgain).sort()).toEqual([1, 2, 7])
	})
})
