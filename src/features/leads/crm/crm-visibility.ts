import { getRolePermissions } from '@/features/auth/lib/permissions'
import { UserRole, isWriteBypassRole } from '@/features/auth/lib/roles'
import { canManageCrm } from '@/features/leads/crm/crm-policy'

export interface CrmVisibilityInput {
	readonly roleCode: string | null | undefined
	/** Admin granted this person a read-only view of other branches. */
	readonly granted: boolean
	/** Viewer plus subordinates. Ignored for write-bypass roles. */
	readonly treeUserIds: readonly number[]
}

export interface CrmVisibility {
	/** Empty array means the read covers the whole company. */
	readonly visibleUserIds: number[]
	/** Empty array means writes cover the whole company. */
	readonly manageableUserIds: number[]
	readonly canManage: boolean
	readonly canOpenCrm: boolean
}

function isOutsideGrant(roleCode: string | null | undefined): boolean {
	return roleCode === UserRole.PARTNER || roleCode === UserRole.DEFAULT
}

/**
 * CRM scope. A write-bypass role sees and edits the company. Everyone else
 * stays on their branch unless an admin granted `canViewOthersCrm`: that
 * grant widens reads (lead states and reports) and never widens writes.
 */
export function resolveCrmVisibility(input: CrmVisibilityInput): CrmVisibility {
	const writeBypass = isWriteBypassRole(input.roleCode)
	const tree = [...input.treeUserIds]
	const companyRead = input.granted && !writeBypass && !isOutsideGrant(input.roleCode)
	const roleLeads = getRolePermissions(input.roleCode)?.leads === true

	return {
		visibleUserIds: writeBypass || companyRead ? [] : tree,
		manageableUserIds: writeBypass ? [] : tree,
		canManage: canManageCrm(input.roleCode),
		canOpenCrm: roleLeads || companyRead,
	}
}
