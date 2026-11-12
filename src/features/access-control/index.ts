/**
 * Public API of the access-control module. Other features import from here
 * (or from the sub-paths) and never re-implement role/permission rules.
 */
export { can, getScope, meetsMinLevel, canWithLevel } from './lib/authorization'
export { buildLevelOrder } from './lib/level-order'
export { PERMISSION_CATALOG, PERMISSION_CODES } from './catalog/permissions.catalog'
export { DEFAULT_ROLE_GRANTS } from './catalog/default-role-grants'
export { loadRoleGrants, loadLevelOrder } from './services/role-grants.service'
export { resolveOwnerScope } from './services/scope-resolver.service'
export { getSubordinateUserIds } from './services/team-hierarchy.service'
export type {
	DataScopeCode,
	PermissionDefinition,
	RoleGrants,
	RolePermissionGrant,
} from './types/access-control.types'
