import type {
	PermissionDefinition,
	RoleGrants,
} from './access-control.types'

export interface RoleOverview {
	id: number
	code: string
	name: string
	description: string | null
	isSystem: boolean
	userCount: number
	permissionCount: number
}

export interface LevelOption {
	code: string
	name: string
}

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
	catalog: readonly PermissionDefinition[]
	/** Levels in chain order (lowest first), for the minimum-level selector. */
	levels: LevelOption[]
}

export interface PermissionChanges {
	added: string[]
	removed: string[]
	changed: string[]
}
