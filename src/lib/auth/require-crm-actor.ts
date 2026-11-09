import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import type { LeadDetail } from '@/features/leads/types/lead.types'

export interface CrmActor {
	idUser: number
	email: string
	roleCode: string | null | undefined
	/** Empty array means "no restriction" (hierarchy bypass role). */
	visibleUserIds: number[]
	canManage: boolean
}

export type RequireCrmActorResult =
	| { ok: true; actor: CrmActor }
	| { ok: false; response: NextResponse<ApiResponse<null>> }

export function crmErrorResponse(message: string, status: number): NextResponse<ApiResponse<null>> {
	return NextResponse.json({ data: null, error: message }, { status })
}

/**
 * Shared guard for CRM route handlers: session (401) → feature flag (404) →
 * user (404) → CRM access (403) → optional management right (403), and the
 * viewer's hierarchy scope.
 */
export async function requireCrmActor(
	flag: FeatureFlag,
	options: { manage?: boolean } = {}
): Promise<RequireCrmActorResult> {
	const session = await auth()
	const email = session?.user?.email
	if (!email) return { ok: false, response: crmErrorResponse('No autorizado', 401) }
	if (!(await isFeatureEnabledServer(flag, email))) {
		return { ok: false, response: crmErrorResponse('CRM no disponible', 404) }
	}

	const currentUser = await getCurrentUserByEmail(email)
	if (!currentUser) return { ok: false, response: crmErrorResponse('Usuario no encontrado', 404) }

	const roleCode = currentUser.role?.code
	if (!canAccessCrm(roleCode)) return { ok: false, response: crmErrorResponse('Sin permisos para CRM', 403) }
	const canManage = canManageCrm(roleCode)
	if (options.manage && !canManage) {
		return { ok: false, response: crmErrorResponse('Sin permisos para modificar CRM', 403) }
	}

	const visibleUserIds = isHierarchyBypassRole(roleCode)
		? []
		: await getAccessibleUserIds(currentUser.idUser)

	return {
		ok: true,
		actor: { idUser: currentUser.idUser, email, roleCode, visibleUserIds, canManage },
	}
}

/** Lead visible to the actor, or null (missing and out-of-scope are indistinguishable). */
export function findScopedLead(actor: CrmActor, idLead: number): Promise<LeadDetail | null> {
	return getLeadDetail(
		idLead,
		{ idUser: actor.idUser, role: actor.roleCode ? { code: actor.roleCode } : null },
		{ visibleUserIds: actor.visibleUserIds }
	)
}

export function canAssignWithinScope(
	actor: Pick<CrmActor, 'idUser' | 'visibleUserIds'>,
	assignee: number | undefined
): boolean {
	if (assignee === undefined) return true
	if (actor.visibleUserIds.length === 0) return true
	return assignee === actor.idUser || actor.visibleUserIds.includes(assignee)
}

export function parsePositiveId(value: string): number | null {
	const parsed = Number.parseInt(value, 10)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
