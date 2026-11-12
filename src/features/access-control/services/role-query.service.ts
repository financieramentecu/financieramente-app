import type { PrismaClient } from '@prisma/client'
import { PERMISSION_CATALOG } from '../catalog/permissions.catalog'
import type { RoleGrants } from '../types/access-control.types'
import { loadRoleGrants } from './role-grants.service'
import { RoleServiceError } from './role-errors'

export interface RoleDetail {
	role: {
		id: number
		code: string
		name: string
		description: string | null
		isSystem: boolean
		userCount: number
	}
	grants: RoleGrants
	catalog: typeof PERMISSION_CATALOG
}

export async function getRoleDetail(
	db: Pick<PrismaClient, 'role' | 'rolePermission' | 'user'>,
	idRole: number
): Promise<RoleDetail> {
	const role = await db.role.findUnique({
		where: { idRole },
		select: { code: true, name: true, description: true, isSystem: true, active: true },
	})
	if (!role || !role.active) throw new RoleServiceError('NOT_FOUND', 'Rol no encontrado')
	const [grants, userCount] = await Promise.all([
		loadRoleGrants(db, role.code),
		db.user.count({ where: { idRole, active: true } }),
	])
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
	}
}
