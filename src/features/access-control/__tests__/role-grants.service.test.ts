import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { loadRoleGrants, loadLevelOrder } from '../services/role-grants.service'

function db(overrides: {
	role?: { idRole: number; active: boolean } | null
	rows?: unknown[]
	levels?: unknown[]
}) {
	return {
		role: { findUnique: vi.fn().mockResolvedValue(overrides.role ?? null) },
		rolePermission: { findMany: vi.fn().mockResolvedValue(overrides.rows ?? []) },
		level: { findMany: vi.fn().mockResolvedValue(overrides.levels ?? []) },
	} as unknown as Pick<PrismaClient, 'role' | 'rolePermission' | 'level'>
}

describe('loadRoleGrants', () => {
	it('maps active role_permission rows to grants keyed by permission code', async () => {
		const grants = await loadRoleGrants(
			db({
				role: { idRole: 4, active: true },
				rows: [
					{ scope: 'TEAM', minLevel: { code: 'LEVEL_2' }, permission: { code: 'negocios.exportar' } },
					{ scope: null, minLevel: null, permission: { code: 'aportes.fondear' } },
				],
			}),
			'AGENTE'
		)
		expect(grants).toEqual({
			'negocios.exportar': { scope: 'TEAM', minLevelCode: 'LEVEL_2' },
			'aportes.fondear': {},
		})
	})

	it('only reads enabled grants of enabled permissions', async () => {
		const client = db({ role: { idRole: 4, active: true } })
		await loadRoleGrants(client, 'AGENTE')
		expect(client.rolePermission.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { idRole: 4, status: true, permission: { status: true } },
			})
		)
	})

	it('fails closed for an unknown, inactive or missing role', async () => {
		expect(await loadRoleGrants(db({ role: null }), 'NOPE')).toEqual({})
		expect(
			await loadRoleGrants(db({ role: { idRole: 4, active: false } }), 'AGENTE')
		).toEqual({})
		expect(await loadRoleGrants(db({}), undefined)).toEqual({})
	})
})

describe('loadLevelOrder', () => {
	it('builds the ascending chain from the level table', async () => {
		const order = await loadLevelOrder(
			db({
				levels: [
					{ code: 'LEVEL_1', nextLevel: { code: 'LEVEL_2' } },
					{ code: 'LEVEL_0', nextLevel: { code: 'LEVEL_1' } },
					{ code: 'LEVEL_2', nextLevel: null },
					{ code: 'PARTNER_EXTERNAL', nextLevel: null },
				],
			})
		)
		expect(order).toEqual(['LEVEL_0', 'LEVEL_1', 'LEVEL_2'])
	})
})
