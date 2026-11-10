import { type AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'

/** Audit a CRM mutation with the actor and request origin (never throws). */
export function auditCrmEvent(ctx: CrmRequestContext, action: AuditAction, details: string): Promise<void> {
	return logAuditEvent({
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		action,
		details,
	})
}
