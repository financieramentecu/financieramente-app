import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	appendLeadActivityTx,
	getLeadActivityPage,
	type AppendLeadActivityInput,
	type LeadActivityPageOptions,
} from '@/features/leads/activities/lead-activity.service'

export type AppendClientActivityInput = Pick<AppendLeadActivityInput, 'idLead' | 'type' | 'payload' | 'occurredAt'>

export function listLeadActivities(idLead: number, options: LeadActivityPageOptions = {}) {
	return getLeadActivityPage(prisma, idLead, options)
}

/** Appends a user-originated timeline event and audits it. */
export async function appendLeadActivity(input: AppendClientActivityInput, ctx: CrmRequestContext) {
	const activity = await prisma.$transaction((tx) =>
		appendLeadActivityTx(tx, { ...input, idUser: ctx.userId, correlationId: crypto.randomUUID() })
	)
	await logAuditEvent({
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		action: AuditAction.LEAD_ACTIVITY_CREATED,
		details: `Lead ${input.idLead}: activity ${input.type} (${activity.idLeadActivity})`,
	})
	return activity
}
