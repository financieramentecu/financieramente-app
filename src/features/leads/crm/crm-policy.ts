import { can } from '@/features/access-control/lib/authorization'
import type { RoleGrants } from '@/features/access-control/types/access-control.types'

/**
 * CRM authorization is driven by the `leads.gestionar` permission: it opens the
 * CRM and allows its mutations. Routes keep applying the hierarchy scope on top.
 * Fails closed: no grants means no access.
 */
export function canAccessCrm(grants: RoleGrants | null | undefined): boolean {
	return can(grants, 'leads.gestionar')
}

/** Mutation right over CRM leads (the data scope narrows which ones). */
export function canManageCrm(grants: RoleGrants | null | undefined): boolean {
	return canAccessCrm(grants)
}

/**
 * Changing the Money Strategy and relating leads is limited to whoever may
 * reassign any lead (`leads.reasignar_estrategia`) or someone who already
 * leads other people. A leaf advisor only sees the result.
 */
export function canLeadMoneyStrategies(
	canReassignAny: boolean,
	accessibleUserIds: readonly number[],
	viewerId: number
): boolean {
	if (canReassignAny) return true
	return accessibleUserIds.some((id) => id !== viewerId)
}
