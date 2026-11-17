export const DATA_SCOPES = ['OWN', 'TEAM', 'COMPANY'] as const

export type DataScopeCode = (typeof DATA_SCOPES)[number]

export interface PermissionDefinition {
	readonly code: string
	readonly name: string
	readonly module: string
	readonly supportsScope: boolean
	readonly supportsMinLevel: boolean
}

/** What a role gets for one permission. Absence of a grant means "no access". */
export interface RolePermissionGrant {
	readonly scope?: DataScopeCode
	/** Level code (e.g. LEVEL_2); only for permissions that support a minimum level. */
	readonly minLevelCode?: string
}

export type RoleGrants = Readonly<Record<string, RolePermissionGrant>>
