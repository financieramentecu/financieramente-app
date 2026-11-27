import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
	loadRoleGrants,
	loadLevelOrder,
	resolveRoleGrants,
} from '../services/role-grants.service'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'

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

describe('resolveRoleGrants (activation flag)', () => {
	const prismaStub = (rows: unknown[] = []) =>
		db({ role: { idRole: 4, active: true }, rows })

	it('serves the in-code defaults unless the source is switched to db', async () => {
		vi.stubEnv('ACCESS_CONTROL_SOURCE', '')
		const client = prismaStub()
		const grants = await resolveRoleGrants(client, 'ASISTENTE_GERENCIA_OPERATIVA')
		expect(grants).toBe(DEFAULT_ROLE_GRANTS.ASISTENTE_GERENCIA_OPERATIVA)
		expect(client.role.findUnique).not.toHaveBeenCalled()
	})

	it('fails closed for an unknown role while on defaults', async () => {
		vi.stubEnv('ACCESS_CONTROL_SOURCE', 'defaults')
		expect(await resolveRoleGrants(prismaStub(), 'CUSTOM')).toEqual({})
		expect(await resolveRoleGrants(prismaStub(), null)).toEqual({})
	})

	it('reads the database when the source is db', async () => {
		vi.stubEnv('ACCESS_CONTROL_SOURCE', 'db')
		const client = prismaStub([
			{ scope: null, minLevel: null, permission: { code: 'aportes.fondear' } },
		])
		expect(await resolveRoleGrants(client, 'CUSTOM')).toEqual({ 'aportes.fondear': {} })
		vi.unstubAllEnvs()
	})
})
