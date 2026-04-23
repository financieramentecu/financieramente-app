import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/nextauth'
import type { UserRole } from '@/features/auth/lib/roles'

export type RequireRoleFailure = {
	ok: false
	response: NextResponse
}

export type RequireRoleSuccess = {
	ok: true
	session: Session
}

/**
 * Require an authenticated session with one of the allowed roles for an API
 * route handler. Returns either `{ ok: true, session }` or `{ ok: false,
 * response }` so handlers can early-return the 401/403 response directly.
 *
 * Usage:
 * ```ts
 * const guard = await requireRole([UserRole.ADMIN])
 * if (!guard.ok) return guard.response
 * const { session } = guard
 * ```
 */
export async function requireRole(
	allowed: readonly UserRole[]
): Promise<RequireRoleSuccess | RequireRoleFailure> {
	const session = (await auth()) as Session | null

	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'No autorizado' },
				{ status: 401 }
			),
		}
	}

	const role = session.user.role
	if (!role || !allowed.includes(role as UserRole)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'Sin permisos' },
				{ status: 403 }
			),
		}
	}

	return { ok: true, session }
}

/**
 * Require an authenticated session (any role). Convenience wrapper for
 * endpoints that shouldn't be callable anonymously.
 */
export async function requireAuth(): Promise<
	RequireRoleSuccess | RequireRoleFailure
> {
	const session = (await auth()) as Session | null
	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ success: false, error: 'No autorizado' },
				{ status: 401 }
			),
		}
	}
	return { ok: true, session }
}
