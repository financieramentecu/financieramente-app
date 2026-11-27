import { roleCanWithLevel } from '@/features/access-control/services/role-permission-check'

/**
 * Whether the user may export the Lista de Negocios to Excel (server side).
 * Decided by the `negocios.exportar` grant of the role plus its configurable
 * minimum hierarchy level (S9). Client button gating uses the same rule through
 * `usePermissions().canWithLevel`. Rows are scoped separately by
 * `resolveVisibleUserIds`.
 */
export function canExportBusinessList(input: {
	roleCode: string | undefined
	levelCode: string | undefined
}): Promise<boolean> {
	return roleCanWithLevel(input.roleCode, 'negocios.exportar', input.levelCode)
}
