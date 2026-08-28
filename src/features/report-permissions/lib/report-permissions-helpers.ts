import { UserRole, isReadOnlyRole } from '@/features/auth/lib/roles'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'

/** Roles that unconditionally bypass category-based report visibility checks. */
export const REPORT_VIEW_BYPASS_ROLES: readonly UserRole[] = [UserRole.ADMIN]

/**
 * Whether the role bypasses the report-category visibility filter.
 * ADMIN always bypasses; read-only roles (CONSULTOR) also bypass visibility
 * only — this MUST NOT be reused to authorize report export (see
 * `isReadOnlyRole` export-guard requirement).
 */
export function isReportViewBypassRole(
	roleCode: string | null | undefined
): boolean {
	if (!roleCode) return false
	return (
		REPORT_VIEW_BYPASS_ROLES.includes(roleCode as UserRole) ||
		isReadOnlyRole(roleCode)
	)
}

/** Catalog codes that ADMIN must always see in the Reportes menu. */
export function knownReportCodes(): readonly string[] {
	return Object.values(REPORT_CODES)
}

export function mergeKnownReportCodes(
	codes: readonly string[] | undefined
): readonly string[] {
	return [...new Set([...knownReportCodes(), ...(codes ?? [])])]
}

/**
 * Pure helpers for Admin UI category selection (Todas cascade).
 */
export function toggleTodas(
	selectAll: boolean,
	categoryIds: readonly number[]
): number[] {
	return selectAll ? [...categoryIds] : []
}

export function isTodasSelected(
	selectedIds: readonly number[],
	allCategoryIds: readonly number[]
): boolean {
	if (allCategoryIds.length === 0) return false
	return allCategoryIds.every((id) => selectedIds.includes(id))
}

export function toggleCategorySelection(
	categoryId: number,
	selectedIds: readonly number[]
): number[] {
	if (selectedIds.includes(categoryId)) {
		return selectedIds.filter((id) => id !== categoryId)
	}
	return [...selectedIds, categoryId]
}

export function canSavePermissions(selectedIds: readonly number[]): boolean {
	return selectedIds.length > 0
}

/** Spanish UI copy for Admin report-permissions page */
export const REPORT_PERMISSIONS_UI = {
	EMPTY_STATE: 'Sin categorías habilitadas',
	SAVE_WARNING: 'Debe seleccionar al menos una categoría',
	SAVE_SUCCESS: 'Permisos actualizados correctamente',
	TODAS: 'Todas',
	SAVE: 'Guardar',
	PAGE_TITLE: 'Permisos de Reportes',
} as const
