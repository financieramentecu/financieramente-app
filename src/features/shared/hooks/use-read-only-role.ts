'use client'

import { useSession } from 'next-auth/react'
import { isReadOnlyRole as checkIsReadOnlyRole } from '@/features/auth/lib/roles'

export const READ_ONLY_ROLE_REASON = 'Solo lectura: tu rol no permite esta acción'

export interface UseReadOnlyRoleResult {
	isReadOnly: boolean
	reason: string
}

/**
 * Whether the current session's role is read-only (CONSULTOR), for gating
 * client-side UI affordances. Server-side enforcement is separate — see
 * `requireWriteAccess()`.
 */
export function useReadOnlyRole(): UseReadOnlyRoleResult {
	const { data: session } = useSession()
	const isReadOnly = checkIsReadOnlyRole(session?.user?.role)

	return {
		isReadOnly,
		reason: READ_ONLY_ROLE_REASON,
	}
}
