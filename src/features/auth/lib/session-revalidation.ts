import { UserRole } from './roles'

/**
 * Pure per-request session revalidation rules (SEC-01, AA-09, PA-08).
 *
 * The caller (Node `jwt` callback) loads the minimal user state from the
 * database and this function decides what to do with the token. It
 * intentionally does NOT look at `activatedAt`: that gate applies at login
 * only, so pending partners remain impersonable and live sessions of already
 * activated users are never affected by it.
 */

export interface SessionUserState {
	readonly active: boolean
	readonly roleCode: string | null
}

export interface SessionRevalidationInput {
	readonly isImpersonating: boolean
	/** State of the user the token currently represents (the target when impersonating). */
	readonly currentUser: SessionUserState | null
	/** State of the original admin; only read while impersonating. */
	readonly originalUser: SessionUserState | null
}

export type SessionRevalidationResult =
	| { readonly action: 'end' }
	| { readonly action: 'keep'; readonly roleCode: string }
	| { readonly action: 'restore_admin' }

const END: SessionRevalidationResult = { action: 'end' }

function isUsable(
	state: SessionUserState | null
): state is SessionUserState & { roleCode: string } {
	return state !== null && state.active && state.roleCode !== null
}

export function resolveSessionRevalidation(
	input: SessionRevalidationInput
): SessionRevalidationResult {
	if (input.isImpersonating) {
		const admin = input.originalUser
		if (!isUsable(admin) || admin.roleCode !== UserRole.ADMIN) {
			return END
		}
		if (!isUsable(input.currentUser)) {
			return { action: 'restore_admin' }
		}
		return { action: 'keep', roleCode: input.currentUser.roleCode }
	}

	if (!isUsable(input.currentUser)) {
		return END
	}
	return { action: 'keep', roleCode: input.currentUser.roleCode }
}
