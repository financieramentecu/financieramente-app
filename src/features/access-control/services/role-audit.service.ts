import {
	logAuditEvent,
	getClientIp,
	getUserAgent,
	type AuditAction,
} from '@/features/auth/lib/audit-logger'

export interface RoleAuditActor {
	userId: number | undefined
	email: string | undefined
}

export function resolveRoleAuditActor(session: {
	user?: { id?: string | null; email?: string | null }
}): RoleAuditActor {
	const parsed = session.user?.id ? parseInt(session.user.id, 10) : NaN
	return {
		userId: Number.isNaN(parsed) ? undefined : parsed,
		email: session.user?.email ?? undefined,
	}
}

/** Records one role mutation. `logAuditEvent` never throws. */
export async function auditRoleEvent(params: {
	action: AuditAction
	actor: RoleAuditActor
	request: Request
	roleId: number
	summary: string
}): Promise<void> {
	await logAuditEvent({
		userId: params.actor.userId,
		roleId: params.roleId,
		action: params.action,
		email: params.actor.email,
		ipAddress: getClientIp(params.request.headers),
		userAgent: getUserAgent(params.request.headers),
		details: `${params.summary} por ${params.actor.email ?? 'administrador'}`,
	})
}
