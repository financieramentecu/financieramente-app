import { isValidRole, UserRole } from '@/features/auth/lib/roles'

/**
 * Admin-like roles that may export the business list regardless of hierarchy level.
 */
const EXPORT_ADMIN_ROLES: readonly UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * Hierarchy level codes (Nivel 2 through Nivel 6 / MIA) authorized to export
 * the business list in addition to admin-like roles.
 */
export const EXPORT_LEVEL_CODES: readonly string[] = [
	'LEVEL_2',
	'LEVEL_3',
	'LEVEL_4',
	'LEVEL_5',
	'GENERAL_LEVEL',
]

function isExportAdminRole(roleCode: string | undefined): boolean {
	if (!roleCode) return false
	return isValidRole(roleCode) && EXPORT_ADMIN_ROLES.includes(roleCode as UserRole)
}

/**
 * Whether the user may export the Lista de Negocios to Excel.
 * Single source of truth shared by client (button gating) and server
 * (`POST /api/negocios/export` authorization) — see spec
 * "Excel Export Authorized by Hierarchy Level 2-6".
 */
export function canExportBusinessList(input: {
	roleCode: string | undefined
	levelCode: string | undefined
}): boolean {
	const { roleCode, levelCode } = input

	if (isExportAdminRole(roleCode)) return true
	if (!levelCode) return false

	return EXPORT_LEVEL_CODES.includes(levelCode)
}
