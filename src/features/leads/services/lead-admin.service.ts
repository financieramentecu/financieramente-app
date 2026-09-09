import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { canDeleteLead } from '@/features/leads/lib/can-delete-lead'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export interface AuditContext {
	userId?: number
	email?: string
	ipAddress?: string
	userAgent?: string
}

/**
 * Admin-only soft delete of a `Lead`. Fetches fresh and re-evaluates
 * `canDeleteLead()` server-side — the client-side render gate is cosmetic
 * only, never trusted alone. Never calls `prisma.lead.delete()`; sets
 * `active: false` so a later CRM resync of the same `externalCrmId` can
 * revive it (see `upsertLeadFromCrm()`).
 */
export async function deleteLead(
	idLead: number,
	auditContext: AuditContext = {}
): Promise<ApiResponse<{ idLead: number }> & { notFound?: boolean }> {
	const lead = await prisma.lead.findUnique({ where: { idLead } })

	if (!lead) {
		return { data: null, error: 'Lead no encontrado', notFound: true }
	}

	if (!canDeleteLead(lead)) {
		return {
			data: null,
			error: 'Este lead no se puede eliminar',
		}
	}

	await prisma.lead.update({
		where: { idLead },
		data: { active: false },
	})

	await logAuditEvent({
		userId: auditContext.userId,
		email: auditContext.email,
		ipAddress: auditContext.ipAddress,
		userAgent: auditContext.userAgent,
		action: AuditAction.LEAD_DELETED,
		details: `Lead eliminado (soft delete): id ${idLead}`,
	})

	return { data: { idLead } }
}
