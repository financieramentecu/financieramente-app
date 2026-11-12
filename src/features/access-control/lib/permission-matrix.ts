import { PERMISSION_DEPENDENCIES } from '../catalog/permission-dependencies'
import type {
	DataScopeCode,
	PermissionDefinition,
	RoleGrants,
} from '../types/access-control.types'

export interface ModuleGroup {
	readonly module: string
	readonly permissions: readonly PermissionDefinition[]
}

export interface DependencyWarning {
	readonly code: string
	readonly requires: string
}

/** Groups the catalog by module, keeping the catalog order. */
export function groupCatalogByModule(
	catalog: readonly PermissionDefinition[]
): ModuleGroup[] {
	const groups = new Map<string, PermissionDefinition[]>()
	for (const permission of catalog) {
		const list = groups.get(permission.module) ?? []
		list.push(permission)
		groups.set(permission.module, list)
	}
	return [...groups].map(([module, permissions]) => ({ module, permissions }))
}

/** Turns a permission on (narrowest scope first) or off. Never mutates. */
export function toggleGrant(
	grants: RoleGrants,
	permission: PermissionDefinition,
	enabled: boolean
): RoleGrants {
	if (!enabled) {
		const rest = { ...grants }
		delete rest[permission.code]
		return rest
	}
	return {
		...grants,
		[permission.code]: permission.supportsScope ? { scope: 'OWN' } : {},
	}
}

export function setScope(
	grants: RoleGrants,
	code: string,
	scope: DataScopeCode
): RoleGrants {
	const current = grants[code]
	if (!current) return grants
	return { ...grants, [code]: { ...current, scope } }
}

export function setMinLevel(
	grants: RoleGrants,
	code: string,
	minLevelCode: string | undefined
): RoleGrants {
	const current = grants[code]
	if (!current) return grants
	const { minLevelCode: _previous, ...rest } = current
	void _previous
	return {
		...grants,
		[code]: minLevelCode ? { ...rest, minLevelCode } : rest,
	}
}

export function findDependencyWarnings(grants: RoleGrants): DependencyWarning[] {
	return Object.entries(PERMISSION_DEPENDENCIES)
		.filter(([code, requires]) => code in grants && !(requires in grants))
		.map(([code, requires]) => ({ code, requires }))
}

export function grantsEqual(a: RoleGrants, b: RoleGrants): boolean {
	const keysA = Object.keys(a)
	if (keysA.length !== Object.keys(b).length) return false
	return keysA.every((key) => {
		const other = b[key]
		return (
			other !== undefined &&
			a[key].scope === other.scope &&
			a[key].minLevelCode === other.minLevelCode
		)
	})
}
