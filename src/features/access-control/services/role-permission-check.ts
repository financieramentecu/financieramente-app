import { prisma } from '@/lib/prisma'
import { canWithLevel, can, getScope } from '../lib/authorization'
import type { DataScopeCode, RoleGrants } from '../types/access-control.types'
import { resolveLevelOrder, resolveRoleGrants } from './role-grants.service'

/**
 * Server-side entry for code that only knows a role code (API routes,
 * services). Honors the activation flag; unknown or missing roles fail closed.
 */
export function getRoleGrants(
	roleCode: string | null | undefined
): Promise<RoleGrants> {
	return resolveRoleGrants(prisma, roleCode)
}

export async function roleCan(
	roleCode: string | null | undefined,
	permissionCode: string
): Promise<boolean> {
	return can(await getRoleGrants(roleCode), permissionCode)
}

export async function roleScope(
	roleCode: string | null | undefined,
	permissionCode: string
): Promise<DataScopeCode | undefined> {
	return getScope(await getRoleGrants(roleCode), permissionCode)
}

/** Permission granted AND the user's level reaches the grant's minimum level. */
export async function roleCanWithLevel(
	roleCode: string | null | undefined,
	permissionCode: string,
	levelCode: string | null | undefined
): Promise<boolean> {
	const grants = await getRoleGrants(roleCode)
	if (!can(grants, permissionCode)) return false
	return canWithLevel(grants, permissionCode, levelCode, await resolveLevelOrder(prisma))
}
