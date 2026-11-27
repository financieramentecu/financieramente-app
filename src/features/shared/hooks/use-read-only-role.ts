'use client'

import { usePermissions } from '@/features/shared/hooks/use-permissions'

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
	const { can } = usePermissions()
	// Read-only = cannot edit businesses (CONSULTOR by default)
	const isReadOnly = !can('negocios.editar')

	return {
		isReadOnly,
		reason: READ_ONLY_ROLE_REASON,
	}
}
