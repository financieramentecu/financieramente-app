import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { getRoleGrants, roleCan, roleScope } from '../services/role-permission-check'

describe('role permission check (defaults mode)', () => {
	it('answers from the in-code defaults without touching the database', async () => {
		expect(await roleCan('ANALISTA_SOPORTE', 'aportes.fondear')).toBe(true)
		expect(await roleCan('AGENTE', 'aportes.fondear')).toBe(false)
		expect(await roleScope('AGENTE', 'negocios.ver')).toBe('TEAM')
	})

	it('fails closed for missing or unknown roles', async () => {
		expect(await getRoleGrants(undefined)).toEqual({})
		expect(await roleCan('NOPE', 'negocios.ver')).toBe(false)
	})
})
