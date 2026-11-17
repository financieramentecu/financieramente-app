import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RoleGrants } from '@/features/access-control/types/access-control.types'

const getRoleGrants = vi.hoisted(() => vi.fn())
vi.mock('@/features/access-control/services/role-permission-check', () => ({
	getRoleGrants,
}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { resolveBusinessOwnerId } from '@/features/negocios/services/business-access.service'

// 1 leads 2; 3 is outside the team
const db = {
	user: {
		findMany: vi.fn().mockResolvedValue([
			{ idUser: 1, idUserLeader: null },
			{ idUser: 2, idUserLeader: 1 },
			{ idUser: 3, idUserLeader: null },
		]),
	},
}
const user = { idUser: 1, role: { code: 'CUSTOM' } }
const run = (requestedIdUser: number) =>
	resolveBusinessOwnerId(db as never, { user, requestedIdUser })

function grantsOf(assign?: 'COMPANY' | 'TEAM' | 'OWN'): RoleGrants {
	return {
		'negocios.crear': {},
		'negocios.ver': { scope: 'OWN' },
		...(assign ? { 'negocios.asignar_strategist': { scope: assign } } : {}),
	} as RoleGrants
}

describe('resolveBusinessOwnerId — negocios.asignar_strategist', () => {
	beforeEach(() => getRoleGrants.mockReset())

	it('COMPANY assigns any user even when negocios.ver is OWN', async () => {
		getRoleGrants.mockResolvedValue(grantsOf('COMPANY'))
		expect(await run(3)).toEqual({ ok: true, idUser: 3 })
	})

	it('TEAM assigns self and subordinates but rejects users outside the team', async () => {
		getRoleGrants.mockResolvedValue(grantsOf('TEAM'))
		expect(await run(2)).toEqual({ ok: true, idUser: 2 })
		expect(await run(3)).toEqual({ ok: false })
	})

	it.each(['OWN', undefined] as const)(
		'%s (or no grant) forces the session user, ignoring the request',
		async (assign) => {
			getRoleGrants.mockResolvedValue(grantsOf(assign))
			expect(await run(3)).toEqual({ ok: true, idUser: 1 })
		}
	)

	it('is denied without negocios.crear, whatever the assign scope', async () => {
		getRoleGrants.mockResolvedValue({
			'negocios.asignar_strategist': { scope: 'COMPANY' },
		} as RoleGrants)
		expect(await run(3)).toEqual({ ok: false })
	})
})
