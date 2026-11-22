import type { DataScopeCode } from '@/features/access-control/types/access-control.types'

export interface CrmVisibilityInput {
	/** Scope of `leads.gestionar`; `undefined` when the role does not hold it. */
	readonly manageScope: DataScopeCode | undefined
	/** The role holds `leads.ver`, the prerequisite to receive the other-branches grant. */
	readonly canViewLeads: boolean
	/** Admin granted this person a read-only view of other branches. */
	readonly granted: boolean
	/** Viewer plus subordinates. Ignored for company-wide writers. */
	readonly treeUserIds: readonly number[]
	/** Viewer id, used when the scope is `OWN`. */
	readonly viewerId: number
}

export interface CrmVisibility {
	/** Empty array means the read covers the whole company. */
	readonly visibleUserIds: number[]
	/** Empty array means writes cover the whole company. */
	readonly manageableUserIds: number[]
	readonly canManage: boolean
	readonly canOpenCrm: boolean
	/** Writes cover the whole company (`COMPANY` scope of `leads.gestionar`). */
	readonly companyWrite: boolean
}

/**
 * CRM scope. A company-scope writer sees and edits the company. Everyone else
 * stays on their branch unless an admin granted `canViewOthersCrm`: that
 * grant widens reads (lead states and reports) and never widens writes.
 */
export function resolveCrmVisibility(input: CrmVisibilityInput): CrmVisibility {
	const canManage = input.manageScope !== undefined
	const companyWrite = input.manageScope === 'COMPANY'
	const scoped =
		input.manageScope === 'OWN' ? [input.viewerId] : [...input.treeUserIds]
	const companyRead = input.granted && !companyWrite && input.canViewLeads

	return {
		visibleUserIds: companyWrite || companyRead ? [] : scoped,
		manageableUserIds: companyWrite ? [] : scoped,
		canManage,
		canOpenCrm: canManage || companyRead,
		companyWrite,
	}
}
