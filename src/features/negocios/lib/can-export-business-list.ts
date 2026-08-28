import { isReadOnlyRole, isWriteBypassRole } from '@/features/auth/lib/roles'

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

/**
 * Whether the user may export the Lista de Negocios to Excel.
 * Single source of truth shared by client (button gating) and server
 * (`POST /api/negocios/export` authorization) — see spec
 * "Excel Export Authorized by Hierarchy Level 2-6".
 *
 * Read-only precedence: the read-only check MUST run before `levelCode` is
 * ever read, so no assigned hierarchy level can re-enable export for a
 * read-only role (e.g. CONSULTOR).
 */
export function canExportBusinessList(input: {
	roleCode: string | undefined
	levelCode: string | undefined
}): boolean {
	const { roleCode, levelCode } = input

	if (isReadOnlyRole(roleCode)) return false
	if (isWriteBypassRole(roleCode)) return true
	if (!levelCode) return false

	return EXPORT_LEVEL_CODES.includes(levelCode)
}
