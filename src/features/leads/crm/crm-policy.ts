import {
	UserRole,
	isReadOnlyRole,
	isValidRole,
} from '@/features/auth/lib/roles'

/**
 * CRM authorization starts fail-closed while routes continue to apply the
 * existing hierarchy scope. This is intentionally separate from UI flags.
 */
export function canAccessCrm(roleCode: string | null | undefined): boolean {
	if (!roleCode || !isValidRole(roleCode)) return false
	return roleCode !== UserRole.DEFAULT
}

/**
 * Consultors retain global read visibility but never gain CRM mutation rights.
 */
export function canManageCrm(roleCode: string | null | undefined): boolean {
	return canAccessCrm(roleCode) && !isReadOnlyRole(roleCode)
}
