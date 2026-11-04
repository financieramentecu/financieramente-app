import { describe, it, expect, vi } from 'vitest'

const sharedClient = vi.hoisted(() => ({
	user: { findMany: vi.fn() },
	business: { findFirst: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: sharedClient }))

import {
	assertBusinessAccess,
	checkBusinessRoleGate,
	resolveBusinessOwnerId,
	resolveBusinessScope,
} from '@/features/negocios/services/business-access.service'
import { UserRole } from '@/features/auth/lib/roles'

/**
 * Hierarchy used by the matrix:
 *   1 (agent leader) -> 2 (subordinate agent)
 *   3 (foreign agent), 10 (partner A), 11 (partner B)
 * Businesses: 100 owned by 1, 200 owned by 2, 300 owned by 3, 400 owned by 10, 500 owned by 11
 */
const USERS = [
	{ idUser: 1, idUserLeader: null },
	{ idUser: 2, idUserLeader: 1 },
	{ idUser: 3, idUserLeader: null },
	{ idUser: 10, idUserLeader: 1 },
	{ idUser: 11, idUserLeader: 1 },
]
const BUSINESS_OWNERS: Record<number, number> = {
	100: 1,
	200: 2,
	300: 3,
	400: 10,
	500: 11,
}

function makePrisma() {
	return {
		user: { findMany: vi.fn().mockResolvedValue(USERS) },
		business: {
			findFirst: vi.fn(
				async ({
					where,
				}: {
					where: { idBusiness: number; idUser?: { in: number[] } }
				}) => {
					const owner = BUSINESS_OWNERS[where.idBusiness]
					if (owner === undefined) return null
					if (where.idUser && !where.idUser.in.includes(owner)) return null
					return { idUser: owner }
				}
			),
		},
	}
}

const asUser = (idUser: number, code: string | null) => ({
	idUser,
	role: code === null ? null : { code },
})

describe('resolveBusinessScope', () => {
	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
		UserRole.CONSULTOR,
	])('%s sees every business (no idUser filter)', async (role) => {
		const scope = await resolveBusinessScope(
			makePrisma() as never,
			asUser(9, role)
		)
		expect(scope).toEqual({})
	})

	it('AGENTE is scoped to self plus subordinates', async () => {
		const scope = await resolveBusinessScope(
			makePrisma() as never,
			asUser(1, UserRole.AGENTE)
		)
		expect(scope.idUser?.in.sort()).toEqual([1, 10, 11, 2])
	})

	it('PARTNER is scoped to self only and never queries the hierarchy', async () => {
		const prisma = makePrisma()
		const scope = await resolveBusinessScope(
			prisma as never,
			asUser(10, UserRole.PARTNER)
		)
		expect(scope).toEqual({ idUser: { in: [10] } })
		expect(prisma.user.findMany).not.toHaveBeenCalled()
	})

	it.each([UserRole.DEFAULT, 'SOMETHING_NEW', '', null])(
		'role %s fails closed with an empty scope',
		async (role) => {
			const scope = await resolveBusinessScope(
				makePrisma() as never,
				asUser(1, role)
			)
			expect(scope).toEqual({ idUser: { in: [] } })
		}
	)

	it('ownOnly narrows an AGENTE to self but leaves global roles untouched', async () => {
		const agent = await resolveBusinessScope(
			makePrisma() as never,
			asUser(1, UserRole.AGENTE),
			{ ownOnly: true }
		)
		expect(agent).toEqual({ idUser: { in: [1] } })
		const admin = await resolveBusinessScope(
			makePrisma() as never,
			asUser(9, UserRole.ADMIN),
			{ ownOnly: true }
		)
		expect(admin).toEqual({})
	})
})

describe('assertBusinessAccess', () => {
	const run = (
		user: ReturnType<typeof asUser>,
		businessId: number,
		mode: 'read' | 'write',
		options?: { ownOnly?: boolean }
	) =>
		assertBusinessAccess(
			{
				user,
				businessId,
				mode,
				...options,
			},
			makePrisma() as never
		)

	it.each(['read', 'write'] as const)(
		'ADMIN %s: any existing business is allowed, owner returned',
		async (mode) => {
			expect(await run(asUser(9, UserRole.ADMIN), 300, mode)).toEqual({
				ok: true,
				idOwner: 3,
			})
		}
	)

	it.each([UserRole.ASISTENTE_GERENCIA_OPERATIVA, UserRole.ANALISTA_SOPORTE])(
		'%s keeps write access to any business',
		async (role) => {
			expect(await run(asUser(9, role), 300, 'write')).toEqual({
				ok: true,
				idOwner: 3,
			})
		}
	)

	it('CONSULTOR can read any business but write is 403 without querying', async () => {
		expect(await run(asUser(9, UserRole.CONSULTOR), 300, 'read')).toEqual({
			ok: true,
			idOwner: 3,
		})
		const prisma = makePrisma()
		const denied = await assertBusinessAccess(
			{
				user: asUser(9, UserRole.CONSULTOR),
				businessId: 300,
				mode: 'write',
			},
			prisma as never
		)
		expect(denied).toEqual({ ok: false, reason: 'FORBIDDEN' })
		expect(prisma.business.findFirst).not.toHaveBeenCalled()
	})

	it.each(['read', 'write'] as const)(
		'AGENTE %s: own and subordinate businesses are allowed',
		async (mode) => {
			expect(await run(asUser(1, UserRole.AGENTE), 100, mode)).toMatchObject({
				ok: true,
				idOwner: 1,
			})
			expect(await run(asUser(1, UserRole.AGENTE), 200, mode)).toMatchObject({
				ok: true,
				idOwner: 2,
			})
			// partners under the leader are visible through the hierarchy
			expect(await run(asUser(1, UserRole.AGENTE), 400, mode)).toMatchObject({
				ok: true,
				idOwner: 10,
			})
		}
	)

	it.each(['read', 'write'] as const)(
		'AGENTE %s: foreign business is 404 (existence is not leaked)',
		async (mode) => {
			expect(await run(asUser(1, UserRole.AGENTE), 300, mode)).toEqual({
				ok: false,
				reason: 'NOT_FOUND',
			})
		}
	)

	it('AGENTE with ownOnly: a subordinate business is 404, own is allowed', async () => {
		const agent = asUser(1, UserRole.AGENTE)
		expect(await run(agent, 200, 'write', { ownOnly: true })).toMatchObject({
			ok: false,
			reason: 'NOT_FOUND',
		})
		expect(await run(agent, 100, 'write', { ownOnly: true })).toMatchObject({
			ok: true,
			idOwner: 1,
		})
	})

	it.each(['read', 'write'] as const)(
		'PARTNER %s: own business allowed, other partner / agent business 404',
		async (mode) => {
			const partner = asUser(10, UserRole.PARTNER)
			expect(await run(partner, 400, mode)).toMatchObject({
				ok: true,
				idOwner: 10,
			})
			expect(await run(partner, 500, mode)).toEqual({
				ok: false,
				reason: 'NOT_FOUND',
			})
			expect(await run(partner, 100, mode)).toEqual({
				ok: false,
				reason: 'NOT_FOUND',
			})
		}
	)

	it('non-existent business is 404 for every scoped role', async () => {
		expect(await run(asUser(9, UserRole.ADMIN), 999, 'read')).toEqual({
			ok: false,
			reason: 'NOT_FOUND',
		})
		expect(await run(asUser(10, UserRole.PARTNER), 999, 'write')).toEqual({
			ok: false,
			reason: 'NOT_FOUND',
		})
	})

	it.each([UserRole.DEFAULT, 'SOMETHING_NEW', '', null])(
		'role %s fails closed (403) in both modes and never queries a business',
		async (role) => {
			for (const mode of ['read', 'write'] as const) {
				const prisma = makePrisma()
				const result = await assertBusinessAccess(
					{
						user: asUser(1, role),
						businessId: 100,
						mode,
					},
					prisma as never
				)
				expect(result).toEqual({ ok: false, reason: 'FORBIDDEN' })
				expect(prisma.business.findFirst).not.toHaveBeenCalled()
			}
		}
	)

	it('user without a role object fails closed', async () => {
		const result = await assertBusinessAccess(
			{
				user: { idUser: 1 },
				businessId: 100,
				mode: 'read',
			},
			makePrisma() as never
		)
		expect(result).toEqual({ ok: false, reason: 'FORBIDDEN' })
	})
})

describe('assertBusinessAccess default client', () => {
	it('uses the shared Prisma client when no db handle is passed', async () => {
		sharedClient.business.findFirst.mockResolvedValueOnce({ idUser: 7 })
		const result = await assertBusinessAccess({
			user: asUser(9, UserRole.ADMIN),
			businessId: 123,
			mode: 'read',
		})
		expect(result).toEqual({ ok: true, idOwner: 7 })
		expect(sharedClient.business.findFirst).toHaveBeenCalledWith({
			where: { idBusiness: 123 },
			select: { idUser: true },
		})
	})

	it('an explicit db handle wins over the shared client (transactions/tests)', async () => {
		sharedClient.business.findFirst.mockClear()
		const db = makePrisma()
		await assertBusinessAccess(
			{ user: asUser(9, UserRole.ADMIN), businessId: 100, mode: 'read' },
			db as never
		)
		expect(db.business.findFirst).toHaveBeenCalledTimes(1)
		expect(sharedClient.business.findFirst).not.toHaveBeenCalled()
	})
})

describe('resolveBusinessOwnerId', () => {
	const run = (user: ReturnType<typeof asUser>, requestedIdUser: number) =>
		resolveBusinessOwnerId(makePrisma() as never, { user, requestedIdUser })

	it('PARTNER is forced to the session user, ignoring the request', async () => {
		expect(await run(asUser(10, UserRole.PARTNER), 3)).toEqual({
			ok: true,
			idUser: 10,
		})
	})

	it.each([UserRole.ADMIN, UserRole.ANALISTA_SOPORTE])(
		'%s may create on behalf of any user',
		async (role) => {
			expect(await run(asUser(9, role), 10)).toEqual({ ok: true, idUser: 10 })
		}
	)

	it('AGENTE may only create for self or subordinates', async () => {
		expect(await run(asUser(1, UserRole.AGENTE), 2)).toEqual({
			ok: true,
			idUser: 2,
		})
		expect(await run(asUser(1, UserRole.AGENTE), 3)).toEqual({ ok: false })
	})

	it.each([UserRole.CONSULTOR, UserRole.DEFAULT, 'SOMETHING_NEW', null])(
		'role %s is denied',
		async (role) => {
			expect(await run(asUser(1, role), 1)).toEqual({ ok: false })
		}
	)
})

describe('checkBusinessRoleGate', () => {
	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
		UserRole.AGENTE,
		UserRole.PARTNER,
	])('%s passes for read and write', (role) => {
		expect(checkBusinessRoleGate(asUser(1, role), 'read')).toBeNull()
		expect(checkBusinessRoleGate(asUser(1, role), 'write')).toBeNull()
	})

	it('CONSULTOR passes read and gets 403 on write', () => {
		expect(
			checkBusinessRoleGate(asUser(1, UserRole.CONSULTOR), 'read')
		).toBeNull()
		expect(
			checkBusinessRoleGate(asUser(1, UserRole.CONSULTOR), 'write')
		).toEqual({ ok: false, reason: 'FORBIDDEN' })
	})

	it.each([UserRole.DEFAULT, 'SOMETHING_NEW', '', null])(
		'%s fails closed for read and write',
		(role) => {
			expect(checkBusinessRoleGate(asUser(1, role), 'read')).toEqual({
				ok: false,
				reason: 'FORBIDDEN',
			})
			expect(checkBusinessRoleGate(asUser(1, role), 'write')).toEqual({
				ok: false,
				reason: 'FORBIDDEN',
			})
		}
	)
})
