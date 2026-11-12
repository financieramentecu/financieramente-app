import type { PrismaClient } from '@prisma/client'
import { PERMISSION_CATALOG } from '../catalog/permissions.catalog'
import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'

const ADMIN_ROLE_CODE = 'ADMIN'

/**
 * Upserts every catalog permission and soft-disables the ones that are no
 * longer in the catalog. Never deletes rows.
 */
export async function syncPermissionCatalog(
	prisma: PrismaClient
): Promise<void> {
	for (const [index, permission] of PERMISSION_CATALOG.entries()) {
		const fields = {
			name: permission.name,
			module: permission.module,
			sortOrder: index,
			supportsScope: permission.supportsScope,
			supportsMinLevel: permission.supportsMinLevel,
			status: true,
		}
		await prisma.permission.upsert({
			where: { code: permission.code },
			create: { code: permission.code, ...fields },
			update: fields,
		})
	}

	await prisma.permission.updateMany({
		where: { code: { notIn: PERMISSION_CATALOG.map((p) => p.code) } },
		data: { status: false },
	})
}

/**
 * ADMIN is locked: always every permission, COMPANY scope where applicable.
 * New catalog permissions reach ADMIN automatically on every sync.
 */
export async function syncAdminPermissions(
	prisma: PrismaClient
): Promise<void> {
	const admin = await prisma.role.findUnique({
		where: { code: ADMIN_ROLE_CODE },
	})
	if (!admin) return

	const permissions = await prisma.permission.findMany({
		where: { status: true },
		select: { idPermission: true, supportsScope: true },
	})

	for (const permission of permissions) {
		const scope = permission.supportsScope ? ('COMPANY' as const) : null
		await prisma.rolePermission.upsert({
			where: {
				idRole_idPermission: {
					idRole: admin.idRole,
					idPermission: permission.idPermission,
				},
			},
			create: {
				idRole: admin.idRole,
				idPermission: permission.idPermission,
				scope,
				status: true,
			},
			update: { scope, idMinLevel: null, status: true },
		})
	}
}

/**
 * Seeds the initial grants of the non-admin roles. A role that already has
 * any role_permission row is skipped, so re-running the seed never overwrites
 * changes made from the roles editor.
 */
export async function seedDefaultRoleGrants(
	prisma: PrismaClient
): Promise<void> {
	const [roles, permissions, levels] = await Promise.all([
		prisma.role.findMany({
			where: { code: { in: Object.keys(DEFAULT_ROLE_GRANTS) } },
			select: { idRole: true, code: true },
		}),
		prisma.permission.findMany({
			where: { status: true },
			select: { idPermission: true, code: true },
		}),
		prisma.level.findMany({ select: { idLevel: true, code: true } }),
	])
	const permissionIdByCode = new Map(
		permissions.map((p) => [p.code, p.idPermission])
	)
	const levelIdByCode = new Map(levels.map((l) => [l.code, l.idLevel]))

	for (const role of roles) {
		if (role.code === ADMIN_ROLE_CODE) continue
		const existing = await prisma.rolePermission.count({
			where: { idRole: role.idRole },
		})
		if (existing > 0) continue

		const data = Object.entries(DEFAULT_ROLE_GRANTS[role.code] ?? {}).flatMap(
			([code, grant]) => {
				const idPermission = permissionIdByCode.get(code)
				if (idPermission === undefined) return []
				return [
					{
						idRole: role.idRole,
						idPermission,
						scope: grant.scope ?? null,
						idMinLevel: grant.minLevelCode
							? (levelIdByCode.get(grant.minLevelCode) ?? null)
							: null,
						status: true,
					},
				]
			}
		)
		if (data.length > 0) {
			await prisma.rolePermission.createMany({ data })
		}
	}
}
