import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'

export type MoveLeadStageResult = { ok: true } | { ok: false; error: string }

/**
 * Moves a lead to another active funnel column and records the acting user.
 * The route must already have confirmed the lead is inside the viewer's hierarchy.
 */
export async function moveLeadToStage(
	idLead: number,
	toIdLeadFunnelColumn: number,
	ctx: CrmRequestContext
): Promise<MoveLeadStageResult> {
	const [column, lead] = await Promise.all([
		prisma.leadFunnelColumn.findFirst({
			where: { idLeadFunnelColumn: toIdLeadFunnelColumn, active: true },
			select: { idLeadFunnelColumn: true, name: true },
		}),
		prisma.lead.findFirst({
			where: { idLead, active: true },
			select: { idLeadFunnelColumn: true, funnelColumn: { select: { name: true } } },
		}),
	])
	if (!column) return { ok: false, error: 'La etapa no existe o está inactiva' }
	if (!lead) return { ok: false, error: 'Lead no encontrado' }
	if (lead.idLeadFunnelColumn === toIdLeadFunnelColumn) return { ok: true }

	const changedAt = new Date()
	await prisma.$transaction(async (tx) => {
		await tx.lead.update({
			where: { idLead },
			data: { idLeadFunnelColumn: toIdLeadFunnelColumn, lastActivityAt: changedAt },
		})
		await tx.leadStageHistory.create({
			data: {
				idLead,
				fromIdLeadFunnelColumn: lead.idLeadFunnelColumn,
				toIdLeadFunnelColumn,
				source: 'MANUAL',
				idUser: ctx.userId,
				changedAt,
			},
		})
	})

	await logAuditEvent({
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		action: AuditAction.LEAD_STATUS_CHANGED,
		details: `Lead ${idLead} moved from "${lead.funnelColumn.name}" to "${column.name}" by user ${ctx.userId}`,
	})
	return { ok: true }
}
