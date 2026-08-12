import { UserRole } from '@/features/auth/lib/roles'

/** Roles that bypass category-based report visibility checks. */
export const REPORT_VIEW_BYPASS_ROLES: readonly UserRole[] = [UserRole.ADMIN]

export function isReportViewBypassRole(
	roleCode: string | null | undefined
): boolean {
	if (!roleCode) return false
	return REPORT_VIEW_BYPASS_ROLES.includes(roleCode as UserRole)
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
