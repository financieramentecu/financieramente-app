import {
	logAuditEvent,
	getClientIp,
	getUserAgent,
	type AuditAction,
} from '@/features/auth/lib/audit-logger'

export interface PartnerAuditActor {
	userId: number | undefined
	email: string | undefined
}

/** Reads the acting admin out of the session (`user.id` is a string). */
export function resolveAuditActor(session: {
	user?: { id?: string | null; email?: string | null }
}): PartnerAuditActor {
	const parsed = session.user?.id ? parseInt(session.user.id, 10) : NaN
	return {
		userId: Number.isNaN(parsed) ? undefined : parsed,
		email: session.user?.email ?? undefined,
	}
}

/**
 * Records one partner mutation. `email` is the affected partner (searchable);
 * the acting admin is `userId` and is also named in the human-readable detail.
 * `logAuditEvent` never throws, so this can never block the main flow.
 */
export async function auditPartnerEvent(params: {
	action: AuditAction
	actor: PartnerAuditActor
	request: Request
	partner: { name: string; email: string }
	summary: string
}): Promise<void> {
	await logAuditEvent({
		userId: params.actor.userId,
		action: params.action,
		email: params.partner.email,
		ipAddress: getClientIp(params.request.headers),
		userAgent: getUserAgent(params.request.headers),
		details: `${params.summary} por ${params.actor.email ?? 'administrador'}: ${params.partner.name} (${params.partner.email})`,
	})
}
