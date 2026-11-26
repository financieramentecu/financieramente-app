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

/**
 * Changing the Money Strategy and relating leads is limited to an admin or
 * someone who already leads other people. A leaf advisor only sees the result.
 */
export function canLeadMoneyStrategies(
	roleCode: string | null | undefined,
	accessibleUserIds: readonly number[],
	viewerId: number
): boolean {
	if (roleCode === UserRole.ADMIN) return true
	return accessibleUserIds.some((id) => id !== viewerId)
}
