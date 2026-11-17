import type { PrismaClient } from '@prisma/client'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'
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

/**
 * Activation flag of the roles & permissions administration.
 * - `defaults` (unset): grants come from the in-code defaults; no database
 *   read and no seed needed, so a deploy can never lock everyone out.
 * - `db`: grants come from `role_permission`, editable from the roles screen.
 */
export function isDatabaseGrantsEnabled(): boolean {
	return process.env.ACCESS_CONTROL_SOURCE === 'db'
}

/** The grants every authorization decision must use (honors the flag). */
export async function resolveRoleGrants(
	prisma: Pick<PrismaClient, 'role' | 'rolePermission'>,
	roleCode: string | null | undefined
): Promise<RoleGrants> {
	if (!roleCode) return {}
	if (isDatabaseGrantsEnabled()) return loadRoleGrants(prisma, roleCode)
	return DEFAULT_ROLE_GRANTS[roleCode] ?? {}
}

/** Level chain seeded by the product; used while grants come from the defaults. */
export const DEFAULT_LEVEL_ORDER: readonly string[] = [
	'LEVEL_0',
	'LEVEL_1',
	'LEVEL_2',
	'LEVEL_3',
	'LEVEL_4',
	'LEVEL_5',
	'GENERAL_LEVEL',
]

/** Level order honoring the activation flag (no query while on defaults). */
export async function resolveLevelOrder(
	prisma: Pick<PrismaClient, 'level'>
): Promise<readonly string[]> {
	return isDatabaseGrantsEnabled() ? loadLevelOrder(prisma) : DEFAULT_LEVEL_ORDER
}
