import { NextResponse } from 'next/server'
import { isReadOnlyRole } from '@/features/auth/lib/roles'
import {
	requireAuth,
	type RequireRoleFailure,
	type RequireRoleSuccess,
} from '@/lib/auth/require-role'

/**
 * Require an authenticated session whose role has write authority.
 * Rejects with a 403 for a read-only role (CONSULTOR), independent of the
 * client's UI state — see spec "Server-side rejection independent of UI
 * state". Composed on top of `requireAuth()`, so an unauthenticated caller
 * still gets the underlying 401 failure.
 *
 * Usage:
 * ```ts
 * const guard = await requireWriteAccess()
 * if (!guard.ok) return guard.response
 * ```
 */
export async function requireWriteAccess(): Promise<
	RequireRoleSuccess | RequireRoleFailure
> {
	const guard = await requireAuth()
	if (!guard.ok) {
		return guard
	}

	if (isReadOnlyRole(guard.session.user.role)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'Sin permisos' },
				{ status: 403 }
			),
		}
	}

	return guard
}
