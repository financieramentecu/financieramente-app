import { UserRole } from '@/features/auth/lib/roles'

/**
 * Roles allowed to edit client basic info from business edit (COM-63).
 */
export const ROLES_ALLOWED_TO_EDIT_CLIENT_INFO: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

export function canRoleEditClientInfo(roleCode: string | null | undefined): boolean {
	if (!roleCode) return false
	const normalized = roleCode.toUpperCase()
	return ROLES_ALLOWED_TO_EDIT_CLIENT_INFO.some((role) => role === normalized)
}
