import type { PrismaClient } from '@prisma/client'
import { buildLevelOrder } from '../lib/level-order'
import type {
	RoleGrants,
	RolePermissionGrant,
} from '../types/access-control.types'

/**
 * Grants of a role keyed by permission code. Fails closed ({}) for a missing,
 * unknown or inactive role. Only enabled grants of enabled permissions count.
 */
export async function loadRoleGrants(
	prisma: Pick<PrismaClient, 'role' | 'rolePermission'>,
	roleCode: string | null | undefined
): Promise<RoleGrants> {
	if (!roleCode) return {}
	const role = await prisma.role.findUnique({
		where: { code: roleCode },
		select: { idRole: true, active: true },
	})
	if (!role || !role.active) return {}

	const rows = await prisma.rolePermission.findMany({
		where: { idRole: role.idRole, status: true, permission: { status: true } },
		select: {
			scope: true,
			minLevel: { select: { code: true } },
			permission: { select: { code: true } },
		},
	})

	const grants: Record<string, RolePermissionGrant> = {}
	for (const row of rows) {
		grants[row.permission.code] = {
			...(row.scope ? { scope: row.scope } : {}),
			...(row.minLevel ? { minLevelCode: row.minLevel.code } : {}),
		}
	}
	return grants
}

/** Level codes ordered from lowest to highest, for `meetsMinLevel`. */
export async function loadLevelOrder(
	prisma: Pick<PrismaClient, 'level'>
): Promise<string[]> {
	const levels = await prisma.level.findMany({
		select: { code: true, nextLevel: { select: { code: true } } },
	})
	return buildLevelOrder(
		levels.map((l) => ({ code: l.code, nextCode: l.nextLevel?.code ?? null }))
	)
}
