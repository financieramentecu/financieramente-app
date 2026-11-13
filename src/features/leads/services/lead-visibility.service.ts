import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { roleScope } from '@/features/access-control/services/role-permission-check'

export interface LeadVisibility {
	/** The viewer sees every lead; `visibleUserIds` is then irrelevant. */
	unrestricted: boolean
	visibleUserIds: number[]
}

/**
 * Single leads visibility rule, driven by the `leads.ver` scope of the role:
 * COMPANY -> everything; TEAM -> self plus hierarchy; OWN -> self; none -> nothing.
 */
export async function resolveLeadVisibility(
	roleCode: string | null | undefined,
	idUser: number
): Promise<LeadVisibility> {
	switch (await roleScope(roleCode, 'leads.ver')) {
		case 'COMPANY':
			return { unrestricted: true, visibleUserIds: [] }
		case 'TEAM':
			return {
				unrestricted: false,
				visibleUserIds: await getAccessibleUserIds(idUser),
			}
		case 'OWN':
			return { unrestricted: false, visibleUserIds: [idUser] }
		default:
			return { unrestricted: false, visibleUserIds: [] }
	}
}
