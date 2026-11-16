import type { PrismaClient } from '@prisma/client'
import { PERMISSION_CATALOG } from '../catalog/permissions.catalog'
import { buildLevelOrder } from '../lib/level-order'
import type { RoleDetail, RoleOverview } from '../types/role.types'
import { loadRoleGrants } from './role-grants.service'
import { RoleServiceError } from './role-errors'

export async function getRoleDetail(
	db: Pick<PrismaClient, 'role' | 'rolePermission' | 'user' | 'level'>,
	idRole: number
): Promise<RoleDetail> {
	const role = await db.role.findUnique({
		where: { idRole },
		select: { code: true, name: true, description: true, isSystem: true, active: true },
	})
	if (!role || !role.active) throw new RoleServiceError('NOT_FOUND', 'Rol no encontrado')
	const [grants, userCount, levelRows] = await Promise.all([
		loadRoleGrants(db, role.code),
		db.user.count({ where: { idRole, active: true } }),
		db.level.findMany({
			select: { code: true, name: true, nextLevel: { select: { code: true } } },
		}),
	])
	const nameByCode = new Map(levelRows.map((l) => [l.code, l.name]))
	const levels = buildLevelOrder(
		levelRows.map((l) => ({ code: l.code, nextCode: l.nextLevel?.code ?? null }))
	).map((code) => ({ code, name: nameByCode.get(code) ?? code }))
	return {
		role: {
			id: idRole,
			code: role.code,
			name: role.name,
			description: role.description,
			isSystem: role.isSystem,
			userCount,
		},
		grants,
		catalog: PERMISSION_CATALOG,
		levels,
	}
}

/** Active roles with their active user and enabled permission counts. */
export async function listRolesOverview(
	db: Pick<PrismaClient, 'role'>
): Promise<RoleOverview[]> {
	const roles = await db.role.findMany({
		where: { active: true },
		orderBy: { name: 'asc' },
		select: {
			idRole: true,
			code: true,
			name: true,
			description: true,
			isSystem: true,
			_count: {
				select: {
					users: { where: { active: true } },
					rolePermissions: { where: { status: true } },
				},
			},
		},
	})
	return roles.map((role) => ({
		id: role.idRole,
		code: role.code,
		name: role.name,
		description: role.description,
		isSystem: role.isSystem,
		userCount: role._count.users,
		permissionCount: role._count.rolePermissions,
	}))
}
