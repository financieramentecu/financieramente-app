import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import type {
	CreateLeadInput,
	CreatedLead,
} from '@/features/leads/lib/create-lead.schema'
import { escapeLikePattern } from '@/features/leads/lib/escape-like-pattern'
import {
	resolveLeadOrigin,
	assignLeadOrigin,
} from '@/features/leads/services/lead-origin.service'

type CreateLeadResult =
	| { ok: true; lead: CreatedLead }
	| { ok: false; error: string; status: number }

/** Creates a native lead; ownership authorization belongs to the authenticated route. */
export async function createLead(
	input: CreateLeadInput,
	idUser: number,
	ctx: CrmRequestContext
): Promise<CreateLeadResult> {
	const result = await prisma.$transaction(
		async (tx): Promise<CreateLeadResult> => {
			const [owner, column] = await Promise.all([
				tx.user.findFirst({
					where: { idUser, active: true },
					select: { idUser: true, name: true, lastName: true },
				}),
				tx.leadFunnelColumn.findFirst({
					where: { externalStatusKey: 'NUEVO_LEAD', active: true },
					select: { idLeadFunnelColumn: true },
				}),
			])
			if (!owner)
				return {
					ok: false,
					error: 'El Money Strategy no existe o está inactivo',
					status: 400,
				}
			if (!column)
				return {
					ok: false,
					error: 'La etapa Lead Nuevo no está disponible',
					status: 409,
				}
			const duplicate = await tx.lead.findFirst({
				where: {
					active: true,
					OR: [
						...(input.email
							? [
									{
										email: {
											equals: escapeLikePattern(input.email),
											mode: 'insensitive' as const,
										},
									},
								]
							: []),
						...(input.phone ? [{ phone: input.phone }] : []),
						...(input.identityNumber
							? [{ identityNumber: input.identityNumber }]
							: []),
					],
				},
				select: { idLead: true },
			})
			if (duplicate)
				return {
					ok: false,
					error: 'Ya existe un lead con estos datos de contacto',
					status: 409,
				}
			const origin = await resolveLeadOrigin('Propio', tx)
			if (origin.status !== 'ready')
				return {
					ok: false,
					error: 'El origen Propio no está disponible',
					status: 409,
				}
			const changedAt = new Date()
			const lead = await tx.lead.create({
				data: {
					name: input.name,
					lastName: input.lastName || null,
					email: input.email || null,
					phone: input.phone || null,
					identityNumber: input.identityNumber || null,
					idUser,
					idLeadFunnelColumn: column.idLeadFunnelColumn,
					originTag: origin.name,
					outcomeStatus: 'OPEN',
				},
				select: { idLead: true },
			})
			await assignLeadOrigin(
				{
					idLead: lead.idLead,
					idClientOrigin: origin.idClientOrigin,
					seenAt: changedAt,
				},
				tx
			)
			await tx.leadStageHistory.create({
				data: {
					idLead: lead.idLead,
					toIdLeadFunnelColumn: column.idLeadFunnelColumn,
					source: 'MANUAL',
					idUser: ctx.userId,
					changedAt,
				},
			})
			await tx.leadChangeHistory.createMany({
				data: [
					{
						idLead: lead.idLead,
						kind: 'OWNER' as const,
						toLabel: [owner.name, owner.lastName].filter(Boolean).join(' '),
					},
					{
						idLead: lead.idLead,
						kind: 'ORIGIN' as const,
						toLabel: origin.name,
					},
				].map((entry) => ({
					...entry,
					source: 'MANUAL',
					idActor: ctx.userId,
					actorLabel: ctx.email,
					fromLabel: null,
					changedAt,
				})),
			})
			return { ok: true, lead: { idLead: lead.idLead, idUser } }
		},
		{ isolationLevel: 'Serializable' }
	)
	if (result.ok)
		await logAuditEvent({
			...ctx,
			action: AuditAction.LEAD_CREATED,
			details: `Lead ${result.lead.idLead} creado desde Pipelines con origen Propio y Money Strategy ${idUser}`,
		})
	return result
}
