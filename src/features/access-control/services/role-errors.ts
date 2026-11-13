export type RoleErrorCode =
	| 'NOT_FOUND'
	| 'CODE_TAKEN'
	| 'INVALID_NAME'
	| 'LOCKED_ROLE'
	| 'SYSTEM_ROLE'
	| 'SELF_LOCKOUT'
	| 'ROLE_IN_USE'
	| 'INVALID_PERMISSION'
	| 'INVALID_GRANT'

/** Domain error of role administration. The message is user-facing (Spanish). */
export class RoleServiceError extends Error {
	constructor(
		readonly code: RoleErrorCode,
		message: string,
		readonly field?: string
	) {
		super(message)
		this.name = 'RoleServiceError'
	}
}
