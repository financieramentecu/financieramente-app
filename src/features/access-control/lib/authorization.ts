import type {
	DataScopeCode,
	RoleGrants,
	RolePermissionGrant,
} from '../types/access-control.types'

/** Whether the role has the permission. Fails closed when grants are missing. */
export function can(
	grants: RoleGrants | null | undefined,
	permissionCode: string
): boolean {
	return grants?.[permissionCode] !== undefined
}

/** Data scope of a granted permission; undefined when not granted or unscoped. */
export function getScope(
	grants: RoleGrants | null | undefined,
	permissionCode: string
): DataScopeCode | undefined {
	return grants?.[permissionCode]?.scope
}

/**
 * Whether the user's level reaches the grant's minimum level.
 * `levelOrder` comes from `buildLevelOrder` (lowest to highest). A grant with
 * no minimum always passes; a missing, unknown or out-of-chain level fails.
 */
export function meetsMinLevel(
	grant: RolePermissionGrant,
	userLevelCode: string | null | undefined,
	levelOrder: readonly string[]
): boolean {
	if (!grant.minLevelCode) return true
	const required = levelOrder.indexOf(grant.minLevelCode)
	const actual = userLevelCode ? levelOrder.indexOf(userLevelCode) : -1
	return required >= 0 && actual >= required
}

/** Permission granted AND minimum level satisfied. */
export function canWithLevel(
	grants: RoleGrants | null | undefined,
	permissionCode: string,
	userLevelCode: string | null | undefined,
	levelOrder: readonly string[]
): boolean {
	const grant = grants?.[permissionCode]
	return grant !== undefined && meetsMinLevel(grant, userLevelCode, levelOrder)
}

/**
 * Whether a scope limits the viewer to their own businesses or team (the
 * "coach" experience of AGENTE/PARTNER), as opposed to company-wide or none.
 */
export function isOwnerScope(scope: DataScopeCode | undefined): boolean {
	return scope === 'OWN' || scope === 'TEAM'
}
