import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { leadDisplayName } from '@/features/leads/lib/lead-display-name'
import { assignLeadOrigin } from '@/features/leads/services/lead-origin.service'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import {
	LEAD_LINK_SIDES,
	type LeadCandidate,
	type LeadRelationSummary,
} from '@/features/leads/types/lead-link.types'

const LEAD_SELECT = {
	idLead: true,
	name: true,
	lastName: true,
	originTag: true,
	idUser: true,
	active: true,
} satisfies Prisma.LeadSelect

type LinkLead = Prisma.LeadGetPayload<{ select: typeof LEAD_SELECT }>

export type RelateLeadResult =
	| {
			ok: true
			relation: LeadRelationSummary
			idUser: number | null
			ownerName: string | null
	  }
	| { ok: false; error: string }

function personName(user: { name: string; lastName: string | null } | null): string | null {
	if (!user) return null
	const name = [user.name, user.lastName].filter(Boolean).join(' ').trim()
	return name || null
}

/**
 * Validates an origin from the catalogue and links this lead to another one.
 * Both leads keep their own card. They share one advisor.
 */
export async function relateLead(
	idLead: number,
	idRelatedLead: number,
	idClientOrigin: number,
	ctx: CrmRequestContext
): Promise<RelateLeadResult> {
	if (idLead === idRelatedLead) {
		return { ok: false, error: 'Un lead no se puede relacionar consigo mismo' }
	}

	const [current, related, origin, existing] = await Promise.all([
		prisma.lead.findFirst({ where: { idLead, active: true }, select: LEAD_SELECT }),
		prisma.lead.findFirst({ where: { idLead: idRelatedLead, active: true }, select: LEAD_SELECT }),
		prisma.clientOrigin.findFirst({
			where: { idClientOrigin },
			select: { idClientOrigin: true, name: true, status: true },
		}),
		prisma.leadLink.findFirst({
			where: {
				active: true,
				OR: [
					{ idLead, idRelatedLead },
					{ idLead: idRelatedLead, idRelatedLead: idLead },
				],
			},
			select: { idLeadLink: true },
		}),
	])

	if (!current || !related) return { ok: false, error: 'Lead no encontrado' }
	if (!origin) return { ok: false, error: 'El origen no existe' }
	if (!origin.status) return { ok: false, error: 'El origen no está activo' }
	if (existing) return { ok: false, error: 'Estos leads ya están relacionados' }

	const seenAt = new Date()
	const sharedAdvisor = related.idUser ?? current.idUser
	const linked = await prisma.$transaction(async (tx) => {
		await shareAdvisor(tx, current, related, sharedAdvisor)
		return tx.leadLink.create({
			data: {
				idLead,
				idRelatedLead,
				idClientOrigin,
				source: 'MANUAL',
				active: true,
				linkedAt: seenAt,
				linkedBy: ctx.userId,
			},
			select: { idLeadLink: true, linkedAt: true },
		})
	})

	await assignLeadOrigin({ idLead, idClientOrigin, seenAt })
	if (!current.originTag) {
		await prisma.lead.update({
			where: { idLead },
			data: { originTag: origin.name },
		})
	}

	const owner = sharedAdvisor
		? await prisma.user.findFirst({
				where: { idUser: sharedAdvisor, active: true },
				select: { name: true, lastName: true },
			})
		: null

	await logAuditEvent({
		action: AuditAction.LEAD_RELATED,
		userId: ctx.userId,
		email: ctx.email,
		ipAddress: ctx.ipAddress,
		userAgent: ctx.userAgent,
		details: `Lead ${idLead} relacionado con ${idRelatedLead} por el origen ${origin.name}`,
	})

	return {
		ok: true,
		idUser: sharedAdvisor,
		ownerName: personName(owner),
		relation: {
			idLeadLink: linked.idLeadLink,
			otherLeadId: related.idLead,
			otherName: leadDisplayName(related),
			originName: origin.name,
			side: LEAD_LINK_SIDES.INCOMING,
			source: 'MANUAL',
			linkedAt: linked.linkedAt.toISOString(),
		},
	}
}

async function shareAdvisor(
	tx: Prisma.TransactionClient,
	current: LinkLead,
	related: LinkLead,
	sharedAdvisor: number | null
): Promise<void> {
	if (sharedAdvisor == null) return
	const updates: Promise<unknown>[] = []
	if (current.idUser !== sharedAdvisor) {
		updates.push(tx.lead.update({ where: { idLead: current.idLead }, data: { idUser: sharedAdvisor } }))
	}
	if (related.idUser !== sharedAdvisor) {
		updates.push(tx.lead.update({ where: { idLead: related.idLead }, data: { idUser: sharedAdvisor } }))
	}
	await Promise.all(updates)
}

/** Leads the viewer can relate, matched by name, email, phone or document. */
export async function searchLeadCandidates(
	viewer: LeadViewer,
	options: { visibleUserIds?: number[] },
	query: string,
	excludeId: number
): Promise<LeadCandidate[]> {
	const term = query.trim()
	if (term.length < 2) return []
	const where = buildLeadListWhere(viewer, {}, options)
	const leads = await prisma.lead.findMany({
		where: {
			AND: [
				where,
				{ idLead: { not: excludeId } },
				{
					OR: [
						{ name: { contains: term, mode: 'insensitive' } },
						{ lastName: { contains: term, mode: 'insensitive' } },
						{ email: { contains: term, mode: 'insensitive' } },
						{ phone: { contains: term } },
						{ identityNumber: { contains: term } },
					],
				},
			],
		},
		take: 8,
		orderBy: { updatedAt: 'desc' },
		select: {
			idLead: true,
			name: true,
			lastName: true,
			email: true,
			phone: true,
			originTag: true,
		},
	})
	return leads.map((lead) => ({
		idLead: lead.idLead,
		name: leadDisplayName(lead),
		email: lead.email,
		phone: lead.phone,
		originTag: lead.originTag,
	}))
}
