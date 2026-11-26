import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import {
	collectPersonGroupIds,
	resolvePersonGroupOwner,
	propagatePersonGroupOwner,
	LeadPersonGroupError,
} from './lead-person-group.service'

export type AssignLeadOwnerResult =
	| { ok: true; idUser: number; ownerName: string; assignedLeadIds: number[] }
	| { ok: false; error: string; status?: number }

export function collectSamePersonLeadIds(idLead: number) {
	return collectPersonGroupIds([idLead])
}

export async function assignLeadOwner(
	idLead: number,
	idUser: number,
	ctx: CrmRequestContext,
	manageableUserIds: readonly number[] = [ctx.userId]
): Promise<AssignLeadOwnerResult> {
	try {
		const result = await prisma.$transaction(
			async (tx) => {
				if (
					!(await tx.lead.findFirst({
						where: { idLead, active: true },
						select: { idLead: true },
					}))
				)
					throw new LeadPersonGroupError()
				const assignedLeadIds = await collectPersonGroupIds([idLead], tx)
				await resolvePersonGroupOwner(tx, assignedLeadIds, {
					manageableUserIds,
					targetOwnerId: idUser,
				})
				await propagatePersonGroupOwner(tx, assignedLeadIds, idUser, {
					source: 'MANUAL',
					idActor: ctx.userId,
					actorLabel: ctx.email,
				})
				const owner = await tx.user.findFirst({
					where: { idUser, active: true },
					select: { name: true, lastName: true },
				})
				if (!owner) throw new LeadPersonGroupError()
				return {
					ok: true as const,
					idUser,
					ownerName: [owner.name, owner.lastName].filter(Boolean).join(' '),
					assignedLeadIds,
				}
			},
			{ isolationLevel: 'Serializable' }
		)
		await logAuditEvent({
			...ctx,
			action: AuditAction.LEAD_OWNER_ASSIGNED,
			details: `Money Strategy ${result.ownerName} (idUser: ${idUser}) asignado a los leads ${result.assignedLeadIds.join(', ')}`,
		})
		return result
	} catch (cause) {
		if (cause instanceof LeadPersonGroupError)
			return { ok: false, error: cause.message, status: 409 }
		throw cause
	}
}
