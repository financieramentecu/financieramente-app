import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiErrorResponse } from '@/features/shared/types/api-response.types'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { isWriteBypassRole } from '@/features/auth/lib/roles'
import { resolveCrmVisibility } from '@/features/leads/crm/crm-visibility'
import { isLeadVisible } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canLeadMoneyStrategies, canManageCrm } from '@/features/leads/crm/crm-policy'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'

export interface CrmActor {
	idUser: number
	email: string
	roleCode: string | null | undefined
	/** Empty array means company-wide read. */
	visibleUserIds: number[]
	/** Empty array means company-wide write. A read grant does not widen this. */
	manageableUserIds: number[]
	/** Effective grant: read other branches' lead states and CRM reports. */
	canViewOthersCrm: boolean
	canManage: boolean
	/** User category, for category-based report permissions (`canViewReport`). */
	idCategory: number | null
}

export type RequireCrmActorResult =
	| { ok: true; actor: CrmActor }
	| { ok: false; response: NextResponse<ApiErrorResponse> }

export function crmErrorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
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

	const treeUserIds = isWriteBypassRole(roleCode)
		? []
		: await getAccessibleUserIds(currentUser.idUser)
	const visibility = resolveCrmVisibility({
		roleCode,
		granted: currentUser.canViewOthersCrm === true,
		treeUserIds,
	})

	if (!visibility.canOpenCrm) {
		return { ok: false, response: crmErrorResponse('Sin permisos para CRM', 403) }
	}

	return {
		ok: true,
		actor: {
			idUser: currentUser.idUser,
			email,
			roleCode,
			visibleUserIds: visibility.visibleUserIds,
			manageableUserIds: visibility.manageableUserIds,
			canViewOthersCrm: visibility.visibleUserIds.length === 0 && !isWriteBypassRole(roleCode),
			canManage,
			idCategory: currentUser.idCategory ?? null,
		},
	}
}

/** Lead visible to the actor. `write` uses the branch they may change. */
export function findScopedLead(
	actor: CrmActor,
	idLead: number,
	access: 'read' | 'write' = 'read'
): Promise<boolean> {
	const visibleUserIds =
		access === 'write' ? (actor.manageableUserIds ?? actor.visibleUserIds) : actor.visibleUserIds
	return isLeadVisible(idLead, toLeadViewer(actor), { visibleUserIds })
}

/** Admin, or a viewer who has at least one person under them. */
export async function actorLeadsMoneyStrategies(actor: CrmActor): Promise<boolean> {
	if (canLeadMoneyStrategies(actor.roleCode, actor.visibleUserIds, actor.idUser)) return true
	if (actor.visibleUserIds.length > 0) return false
	const accessible = await getAccessibleUserIds(actor.idUser)
	return canLeadMoneyStrategies(actor.roleCode, accessible, actor.idUser)
}

export function canAssignWithinScope(
	actor: Pick<CrmActor, 'idUser' | 'visibleUserIds'> & { manageableUserIds?: number[] },
	assignee: number | undefined
): boolean {
	if (assignee === undefined) return true
	const scope = actor.manageableUserIds ?? actor.visibleUserIds
	if (scope.length === 0) return true
	return assignee === actor.idUser || scope.includes(assignee)
}

export function parsePositiveId(value: string): number | null {
	const parsed = Number.parseInt(value, 10)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

/** Hierarchy viewer shape expected by the lead services. */
export function toLeadViewer(actor: CrmActor): { idUser: number; role: { code: string } | null } {
	return { idUser: actor.idUser, role: actor.roleCode ? { code: actor.roleCode } : null }
}

/** Audit context (who and from where) for a CRM mutation. */
export function toCrmRequestContext(actor: CrmActor, request: Request): CrmRequestContext {
	return {
		userId: actor.idUser,
		email: actor.email,
		ipAddress: getClientIp(request.headers),
		userAgent: getUserAgent(request.headers),
	}
}

/** Parsed JSON body, or `undefined` when it is missing or malformed (callers answer 400). */
export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json()
	} catch {
		return undefined
	}
}
