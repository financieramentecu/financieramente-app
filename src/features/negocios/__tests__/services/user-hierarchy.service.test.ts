import { describe, it, expect, vi } from 'vitest'
import {
	getSubordinateUserIds,
	resolveVisibleUserIds,
} from '@/features/negocios/services/user-hierarchy.service'
import { UserRole } from '@/features/auth/lib/roles'

// Minimal prisma mock shape
const makeUsers = (rows: { idUser: number; idUserLeader: number | null }[]) => {
	const mockPrisma = {
		user: {
			findMany: vi.fn().mockResolvedValue(rows),
		},
	}
	return mockPrisma
}

describe('getSubordinateUserIds', () => {
	it('linear chain: A→B→C→D, root=A returns [B,C,D]', async () => {
		const prisma = makeUsers([
			{ idUser: 1, idUserLeader: null }, // A
			{ idUser: 2, idUserLeader: 1 }, // B reports to A
			{ idUser: 3, idUserLeader: 2 }, // C reports to B
			{ idUser: 4, idUserLeader: 3 }, // D reports to C
		])

		const result = await getSubordinateUserIds(prisma as never, 1)
		expect(result).toEqual(expect.arrayContaining([2, 3, 4]))
		expect(result).toHaveLength(3)
		expect(result).not.toContain(1) // root NOT included
	})

	it('empty tree: user with no reports returns []', async () => {
		const prisma = makeUsers([
			{ idUser: 5, idUserLeader: null },
		])

		const result = await getSubordinateUserIds(prisma as never, 5)
		expect(result).toEqual([])
	})

	it('single level: A→[B,C], root=A returns [B,C]', async () => {
		const prisma = makeUsers([
			{ idUser: 10, idUserLeader: null }, // A
			{ idUser: 11, idUserLeader: 10 }, // B
			{ idUser: 12, idUserLeader: 10 }, // C
		])

		const result = await getSubordinateUserIds(prisma as never, 10)
		expect(result).toEqual(expect.arrayContaining([11, 12]))
		expect(result).toHaveLength(2)
	})

	it('cycle safety: A→B, B→A terminates without infinite loop', async () => {
		// A has idUserLeader = B and B has idUserLeader = A — malformed data
		const prisma = makeUsers([
			{ idUser: 20, idUserLeader: 21 }, // A's leader is B
			{ idUser: 21, idUserLeader: 20 }, // B's leader is A
		])

		// Should terminate and not throw. Root=20 (A), B(21) is a subordinate, then A(20) would be next but visited
		const result = await getSubordinateUserIds(prisma as never, 20)
		expect(result).not.toContain(20) // root not included
		// B is a subordinate of A, should be included
		expect(result).toContain(21)
		// No duplicates
		expect(result.length).toBe(new Set(result).size)
	})

	it('root not in result: only subordinates returned', async () => {
		const prisma = makeUsers([
			{ idUser: 30, idUserLeader: null },
			{ idUser: 31, idUserLeader: 30 },
		])

		const result = await getSubordinateUserIds(prisma as never, 30)
		expect(result).not.toContain(30)
		expect(result).toContain(31)
	})

	it('inactive users excluded: only active users loaded', async () => {
		// The service should only query active users (status: true)
		// We verify it by checking the prisma call args
		const mockFindMany = vi.fn().mockResolvedValue([
			{ idUser: 40, idUserLeader: null },
		])
		const prisma = { user: { findMany: mockFindMany } }

		await getSubordinateUserIds(prisma as never, 40)

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ active: true }),
			})
		)
	})

	it('multi-branch: A→[B,C], B→D, root=A returns [B,C,D]', async () => {
		const prisma = makeUsers([
			{ idUser: 50, idUserLeader: null }, // A
			{ idUser: 51, idUserLeader: 50 }, // B
			{ idUser: 52, idUserLeader: 50 }, // C
			{ idUser: 53, idUserLeader: 51 }, // D reports to B
		])

		const result = await getSubordinateUserIds(prisma as never, 50)
		expect(result).toEqual(expect.arrayContaining([51, 52, 53]))
		expect(result).toHaveLength(3)
	})
})

describe('resolveVisibleUserIds', () => {
	it('returns undefined for ADMIN role (no scope filter)', async () => {
		const prisma = makeUsers([])
		const currentUser = {
			idUser: 1,
			role: { code: UserRole.ADMIN },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toBeUndefined()
	})

	it('returns undefined for ASISTENTE_GERENCIA_OPERATIVA role', async () => {
		const prisma = makeUsers([])
		const currentUser = {
			idUser: 1,
			role: { code: UserRole.ASISTENTE_GERENCIA_OPERATIVA },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toBeUndefined()
	})

	it('returns undefined for ANALISTA_SOPORTE role', async () => {
		const prisma = makeUsers([])
		const currentUser = {
			idUser: 1,
			role: { code: UserRole.ANALISTA_SOPORTE },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toBeUndefined()
	})

	it('returns [self, ...subordinates] for non-admin roles', async () => {
		const prisma = makeUsers([
			{ idUser: 60, idUserLeader: null }, // root (currentUser)
			{ idUser: 61, idUserLeader: 60 }, // subordinate
			{ idUser: 62, idUserLeader: 61 }, // sub-subordinate
		])
		const currentUser = {
			idUser: 60,
			role: { code: UserRole.AGENTE },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toEqual(expect.arrayContaining([60, 61, 62]))
		expect(result).toHaveLength(3)
	})

	it('returns [self] only when non-admin has no subordinates', async () => {
		const prisma = makeUsers([{ idUser: 70, idUserLeader: null }])
		const currentUser = {
			idUser: 70,
			role: { code: UserRole.AGENTE },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toEqual([70])
	})

	it('treats user with no role as non-admin (scoped)', async () => {
		const prisma = makeUsers([{ idUser: 80, idUserLeader: null }])
		const currentUser = {
			idUser: 80,
			role: null,
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toEqual([80])
	})

	it('returns undefined for CONSULTOR role (global read-only visibility)', async () => {
		const prisma = makeUsers([])
		const currentUser = {
			idUser: 90,
			role: { code: UserRole.CONSULTOR },
		}

		const result = await resolveVisibleUserIds(prisma as never, currentUser)
		expect(result).toBeUndefined()
	})
})
