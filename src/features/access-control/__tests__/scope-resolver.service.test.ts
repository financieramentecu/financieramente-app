import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { resolveOwnerScope } from '../services/scope-resolver.service'
import { getSubordinateUserIds } from '../services/team-hierarchy.service'

function dbWith(users: Array<{ idUser: number; idUserLeader: number | null }>) {
	return {
		user: { findMany: vi.fn().mockResolvedValue(users) },
	} as unknown as Pick<PrismaClient, 'user'>
}

const TREE = [
	{ idUser: 1, idUserLeader: null },
	{ idUser: 2, idUserLeader: 1 },
	{ idUser: 3, idUserLeader: 2 },
	{ idUser: 4, idUserLeader: 1 },
	{ idUser: 9, idUserLeader: null },
]

describe('getSubordinateUserIds', () => {
	it('collects the whole subtree without the root', async () => {
		const ids = await getSubordinateUserIds(dbWith(TREE), 1)
		expect([...ids].sort()).toEqual([2, 3, 4])
	})

	it('returns an empty list for a leaf', async () => {
		expect(await getSubordinateUserIds(dbWith(TREE), 3)).toEqual([])
	})

	it('survives a leader cycle', async () => {
		const cyclic = [
			{ idUser: 1, idUserLeader: 2 },
			{ idUser: 2, idUserLeader: 1 },
		]
		expect(await getSubordinateUserIds(dbWith(cyclic), 1)).toEqual([2])
	})

	it('only loads active users', async () => {
		const db = dbWith(TREE)
		await getSubordinateUserIds(db, 1)
		expect(db.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { active: true } })
		)
	})
})

describe('resolveOwnerScope', () => {
	it('COMPANY is unrestricted (undefined) and does not query the hierarchy', async () => {
		const db = dbWith(TREE)
		expect(await resolveOwnerScope(db, { idUser: 2 }, 'COMPANY')).toBeUndefined()
		expect(db.user.findMany).not.toHaveBeenCalled()
	})

	it('OWN is just the user', async () => {
		const db = dbWith(TREE)
		expect(await resolveOwnerScope(db, { idUser: 2 }, 'OWN')).toEqual([2])
		expect(db.user.findMany).not.toHaveBeenCalled()
	})

	it('TEAM is the user plus the subtree', async () => {
		const ids = await resolveOwnerScope(dbWith(TREE), { idUser: 1 }, 'TEAM')
		expect([...(ids ?? [])].sort()).toEqual([1, 2, 3, 4])
	})

	it('TEAM with ownOnly narrows to the user (owner-only rules)', async () => {
		const db = dbWith(TREE)
		expect(
			await resolveOwnerScope(db, { idUser: 1 }, 'TEAM', { ownOnly: true })
		).toEqual([1])
		expect(db.user.findMany).not.toHaveBeenCalled()
	})

	it('fails closed (matches nothing) when there is no scope', async () => {
		expect(await resolveOwnerScope(dbWith(TREE), { idUser: 1 }, undefined)).toEqual([])
	})
})
