import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/nextauth'

export type ActionPermissionResult =
	| { ok: true; session: Session }
	| { ok: false; error: 'No autorizado' | 'Sin permisos' }

/**
 * Guard for Server Actions, whose return type is a plain object rather than a
 * `NextResponse` (compare `requireRole` / `requireWriteAccess`, built for route
 * handlers). A Server Action is reachable through any page URL the caller may
 * open, so the Edge allowlist does not protect it: each action must check the
 * session itself (SEC-03).
 *
 * - No session -> `No autorizado`.
 * - `isAllowed(role)` false (missing role included) -> `Sin permisos`.
 * - Without a predicate any authenticated user passes.
 */
export async function requireActionPermission(
	isAllowed?: (role: string | undefined) => boolean
): Promise<ActionPermissionResult> {
	const session = (await auth()) as Session | null
	if (!session?.user) {
		return { ok: false, error: 'No autorizado' }
	}
	if (isAllowed && !isAllowed(session.user.role ?? undefined)) {
		return { ok: false, error: 'Sin permisos' }
	}
	return { ok: true, session }
}
