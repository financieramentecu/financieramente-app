import type { PrismaClient } from '@prisma/client'
import type {
	DataScopeCode,
	RolePermissionGrant,
} from '../types/access-control.types'
import { RoleServiceError } from './role-errors'

type Db = Pick<
	PrismaClient,
	'role' | 'permission' | 'level' | 'rolePermission' | 'user' | '$transaction'
>

/** Roles whose permissions are fixed by design (S7, S8). */
const LOCKED_ROLE_CODES = ['ADMIN', 'SIN_ROL'] as const
const ADMIN_ROLE_CODE = 'ADMIN'
const SELF_MANAGEMENT_PERMISSION = 'roles.gestionar'

export interface RoleInput {
	readonly name: string
	readonly description?: string | null
}

export interface PermissionChanges {
	readonly added: string[]
	readonly removed: string[]
	readonly changed: string[]
}

/** `Líder de Cobranza` -> `LIDER_DE_COBRANZA`. */
export function buildRoleCode(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

async function findActiveRole(db: Pick<Db, 'role'>, idRole: number) {
	const role = await db.role.findUnique({
		where: { idRole },
		select: { idRole: true, code: true, name: true, isSystem: true, active: true },
	})
	if (!role || !role.active) {
		throw new RoleServiceError('NOT_FOUND', 'Rol no encontrado')
	}
	return role
}

export async function createRole(db: Db, input: RoleInput) {
	const code = buildRoleCode(input.name)
	if (!code) {
		throw new RoleServiceError('CODE_TAKEN', 'Nombre de rol inválido', 'name')
	}
	const existing = await db.role.findUnique({
		where: { code },
		select: { idRole: true },
	})
	if (existing) {
		throw new RoleServiceError('CODE_TAKEN', 'Ya existe un rol con ese nombre', 'name')
	}
	return db.role.create({
		data: {
			code,
			name: input.name.trim(),
			description: input.description ?? null,
			isSystem: false,
		},
	})
}

export async function updateRole(db: Db, idRole: number, input: RoleInput) {
	const role = await findActiveRole(db, idRole)
	if (role.code === ADMIN_ROLE_CODE) {
		throw new RoleServiceError('LOCKED_ROLE', 'El rol Administrador no se puede editar')
	}
	return db.role.update({
		where: { idRole },
		data: { name: input.name.trim(), description: input.description ?? null },
	})
}

type CurrentRow = {
	idPermission: number
	status: boolean
	scope: DataScopeCode | null
	minLevel: { code: string } | null
	permission: { code: string }
}

function sameGrant(row: CurrentRow, grant: RolePermissionGrant): boolean {
	return (
		(row.scope ?? undefined) === grant.scope &&
		(row.minLevel?.code ?? undefined) === grant.minLevelCode
	)
}

/**
 * Replaces the full grant set of a role. Validates every grant against the
 * catalog, protects ADMIN / SIN_ROL, and refuses to let the actor remove
 * `roles.gestionar` from their own role.
 */
export async function setRolePermissions(
	db: Db,
	idRole: number,
	actorRoleCode: string,
	grants: Readonly<Record<string, RolePermissionGrant>>
): Promise<PermissionChanges> {
	const role = await findActiveRole(db, idRole)
	if ((LOCKED_ROLE_CODES as readonly string[]).includes(role.code)) {
		throw new RoleServiceError(
			'LOCKED_ROLE',
			'Los permisos de este rol no se pueden modificar'
		)
	}
	if (role.code === actorRoleCode && !(SELF_MANAGEMENT_PERMISSION in grants)) {
		throw new RoleServiceError(
			'SELF_LOCKOUT',
			'No puedes quitarle a tu propio rol el permiso para gestionar roles'
		)
	}

	const [catalog, levels] = await Promise.all([
		db.permission.findMany({
			where: { status: true },
			select: {
				idPermission: true,
				code: true,
				supportsScope: true,
				supportsMinLevel: true,
			},
		}),
		db.level.findMany({ select: { idLevel: true, code: true } }),
	])
	const permissionByCode = new Map(catalog.map((p) => [p.code, p]))
	const levelIdByCode = new Map(levels.map((l) => [l.code, l.idLevel]))

	for (const [code, grant] of Object.entries(grants)) {
		const permission = permissionByCode.get(code)
		if (!permission) {
			throw new RoleServiceError('INVALID_PERMISSION', `Permiso desconocido: ${code}`, code)
		}
		if (permission.supportsScope && !grant.scope) {
			throw new RoleServiceError('INVALID_GRANT', `El permiso ${code} requiere un alcance`, code)
		}
		if (!permission.supportsScope && grant.scope) {
			throw new RoleServiceError('INVALID_GRANT', `El permiso ${code} no admite alcance`, code)
		}
		if (grant.minLevelCode) {
			if (!permission.supportsMinLevel || !levelIdByCode.has(grant.minLevelCode)) {
				throw new RoleServiceError('INVALID_GRANT', `Nivel mínimo inválido para ${code}`, code)
			}
		}
	}

	return db.$transaction(async (tx) => {
		const rows = (await tx.rolePermission.findMany({
			where: { idRole },
			select: {
				idPermission: true,
				status: true,
				scope: true,
				minLevel: { select: { code: true } },
				permission: { select: { code: true } },
			},
		})) as CurrentRow[]
		const active = new Map(
			rows.filter((r) => r.status).map((r) => [r.permission.code, r])
		)

		const added: string[] = []
		const changed: string[] = []
		const removed: string[] = []

		for (const [code, grant] of Object.entries(grants)) {
			const current = active.get(code)
			if (current && sameGrant(current, grant)) continue
			if (current) changed.push(code)
			else added.push(code)

			const permission = permissionByCode.get(code)!
			const idMinLevel = grant.minLevelCode
				? (levelIdByCode.get(grant.minLevelCode) ?? null)
				: null
			const data = { scope: grant.scope ?? null, idMinLevel, status: true }
			await tx.rolePermission.upsert({
				where: { idRole_idPermission: { idRole, idPermission: permission.idPermission } },
				create: { idRole, idPermission: permission.idPermission, ...data },
				update: data,
			})
		}

		const removedIds: number[] = []
		for (const [code, row] of active) {
			if (code in grants) continue
			removed.push(code)
			removedIds.push(row.idPermission)
		}
		if (removedIds.length > 0) {
			await tx.rolePermission.updateMany({
				where: { idRole, idPermission: { in: removedIds } },
				data: { status: false },
			})
		}

		return { added, removed, changed }
	})
}

export async function deactivateRole(
	db: Db,
	idRole: number,
	actorRoleCode: string
) {
	const role = await findActiveRole(db, idRole)
	if (role.isSystem) {
		throw new RoleServiceError('SYSTEM_ROLE', 'Los roles del sistema no se pueden desactivar')
	}
	if (role.code === actorRoleCode) {
		throw new RoleServiceError('SELF_LOCKOUT', 'No puedes desactivar tu propio rol')
	}
	const users = await db.user.count({ where: { idRole, active: true } })
	if (users > 0) {
		throw new RoleServiceError(
			'ROLE_IN_USE',
			`El rol tiene ${users} usuario(s) activo(s); reasígnalos antes de desactivarlo`
		)
	}
	return db.role.update({ where: { idRole }, data: { active: false } })
}
