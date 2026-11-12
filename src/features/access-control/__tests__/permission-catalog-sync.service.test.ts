import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
	syncPermissionCatalog,
	syncAdminPermissions,
	seedDefaultRoleGrants,
} from '../services/permission-catalog-sync.service'
import { PERMISSION_CATALOG } from '../catalog/permissions.catalog'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'

function createPrismaMock() {
	const permissions = PERMISSION_CATALOG.map((p, i) => ({
		idPermission: i + 1,
		code: p.code,
		supportsScope: p.supportsScope,
	}))
	return {
		permission: {
			upsert: vi.fn().mockResolvedValue({}),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			findMany: vi.fn().mockResolvedValue(permissions),
		},
		role: { findMany: vi.fn(), findUnique: vi.fn() },
		level: { findMany: vi.fn().mockResolvedValue([{ idLevel: 3, code: 'LEVEL_2' }]) },
		rolePermission: {
			upsert: vi.fn().mockResolvedValue({}),
			count: vi.fn(),
			createMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
	}
}

describe('permission catalog sync', () => {
	let prisma: ReturnType<typeof createPrismaMock>
	const asClient = () => prisma as unknown as PrismaClient

	beforeEach(() => {
		prisma = createPrismaMock()
	})

	it('upserts every catalog permission and soft-disables the ones no longer in the catalog', async () => {
		await syncPermissionCatalog(asClient())

		expect(prisma.permission.upsert).toHaveBeenCalledTimes(PERMISSION_CATALOG.length)
		const disable = prisma.permission.updateMany.mock.calls[0][0]
		expect(disable.data).toEqual({ status: false })
		expect(disable.where.code.notIn).toHaveLength(PERMISSION_CATALOG.length)
	})

	it('S7: grants ADMIN every permission, with COMPANY scope when it supports scope', async () => {
		prisma.role.findUnique.mockResolvedValue({ idRole: 1, code: 'ADMIN' })

		await syncAdminPermissions(asClient())

		expect(prisma.rolePermission.upsert).toHaveBeenCalledTimes(PERMISSION_CATALOG.length)
		const scoped = PERMISSION_CATALOG.find((p) => p.supportsScope)!
		const call = prisma.rolePermission.upsert.mock.calls.find(
			([arg]) => arg.create.idPermission === PERMISSION_CATALOG.indexOf(scoped) + 1
		)![0]
		expect(call.create).toMatchObject({ idRole: 1, scope: 'COMPANY', status: true })
		expect(call.update).toMatchObject({ status: true })
	})

	it('seeds default grants only for roles that have no permissions yet', async () => {
		prisma.role.findMany.mockResolvedValue([
			{ idRole: 4, code: 'AGENTE' },
			{ idRole: 5, code: 'CONSULTOR' },
		])
		prisma.rolePermission.count.mockImplementation(async ({ where }) =>
			where.idRole === 5 ? 3 : 0
		)

		await seedDefaultRoleGrants(asClient())

		expect(prisma.rolePermission.createMany).toHaveBeenCalledTimes(1)
		const { data } = prisma.rolePermission.createMany.mock.calls[0][0]
		expect(data).toHaveLength(Object.keys(DEFAULT_ROLE_GRANTS.AGENTE).length)
		expect(data.every((row: { idRole: number }) => row.idRole === 4)).toBe(true)
	})

	it('S9: resolves the minimum level code to its level id', async () => {
		prisma.role.findMany.mockResolvedValue([{ idRole: 4, code: 'AGENTE' }])
		prisma.rolePermission.count.mockResolvedValue(0)

		await seedDefaultRoleGrants(asClient())

		const { data } = prisma.rolePermission.createMany.mock.calls[0][0]
		const exportRow = data.find(
			(row: { idPermission: number }) =>
				row.idPermission ===
				PERMISSION_CATALOG.findIndex((p) => p.code === 'negocios.exportar') + 1
		)
		expect(exportRow).toMatchObject({ scope: 'TEAM', idMinLevel: 3 })
	})
})
