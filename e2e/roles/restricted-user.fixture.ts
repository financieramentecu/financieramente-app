import * as fs from 'fs'

/** Where the setup project stores the restricted test user and its session. */
export const RESTRICTED_USER_FILE = 'e2e/.auth/restricted-user.json'
export const RESTRICTED_STORAGE_STATE = 'e2e/.auth/restricted-state.json'
export const ADMIN_STORAGE_STATE_FILE = 'e2e/.auth/admin.json'

export interface RestrictedUser {
	email: string
	roleId: number
	roleName: string
}

export function readRestrictedUser(): RestrictedUser {
	return JSON.parse(fs.readFileSync(RESTRICTED_USER_FILE, 'utf-8')) as RestrictedUser
}
