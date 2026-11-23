import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import type { CrmRequestContext } from '@/features/leads/crm/crm-request-context'
import { recordLeadChanges } from '@/features/leads/services/record-lead-change.service'

export type AssignLeadOwnerResult =
	| { ok: true; idUser: number; ownerName: string; assignedLeadIds: number[] }
	| { ok: false; error: string }

const SAME_PERSON_PASS_LIMIT = 8

interface LeadContact {
	idLead: number
	email: string | null
	phone: string | null
	identityNumber: string | null
}

function displayName(user: { name: string; lastName: string | null }): string {
	return [user.name, user.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

function filled(value: string | null): string | null {
	const trimmed = value?.trim()
	return trimmed ? trimmed : null
}

function uniqueFilled(values: Array<string | null>): string[] {
	return [...new Set(values.flatMap((value) => {
		const next = filled(value)
		return next ? [next] : []
	}))]
}

function contactFilters(leads: LeadContact[]): Prisma.LeadWhereInput[] {
	const emails = uniqueFilled(leads.map((lead) => lead.email))
	const phones = uniqueFilled(leads.map((lead) => lead.phone))
	const documents = uniqueFilled(leads.map((lead) => lead.identityNumber))
	const filters: Prisma.LeadWhereInput[] = []
	if (emails.length > 0) filters.push({ email: { in: emails, mode: 'insensitive' } })
	if (phones.length > 0) filters.push({ phone: { in: phones } })
	if (documents.length > 0) filters.push({ identityNumber: { in: documents } })
	return filters
}

/**
 * The lead itself, every active lead that shares document, email or phone,
 * and every active lead joined through `lead_link`.
 */
export async function collectSamePersonLeadIds(idLead: number): Promise<number[]> {
	const ids = new Set<number>([idLead])
	for (let pass = 0; pass < SAME_PERSON_PASS_LIMIT; pass += 1) {
		const current = [...ids]
		const [contacts, links] = await Promise.all([
			prisma.lead.findMany({
				where: { idLead: { in: current }, active: true },
				select: { idLead: true, email: true, phone: true, identityNumber: true },
			}),
			prisma.leadLink.findMany({
				where: {
					active: true,
					OR: [{ idLead: { in: current } }, { idRelatedLead: { in: current } }],
				},
				select: { idLead: true, idRelatedLead: true },
			}),
		])
		const linkedIds = [...new Set(links.flatMap((link) => [link.idLead, link.idRelatedLead]))]
		const filters = contactFilters(contacts)
		const [linked, matched] = await Promise.all([
			linkedIds.length === 0
				? Promise.resolve([] as Array<{ idLead: number }>)
				: prisma.lead.findMany({
						where: { idLead: { in: linkedIds }, active: true },
						select: { idLead: true },
					}),
			filters.length === 0
				? Promise.resolve([] as Array<{ idLead: number }>)
				: prisma.lead.findMany({
						where: { active: true, OR: filters },
						select: { idLead: true },
					}),
		])
		const size = ids.size
		for (const lead of [...linked, ...matched]) ids.add(lead.idLead)
		if (ids.size === size) break
	}
	return [...ids]
}

/**
 * Sets the Money Strategy on the lead and on every other active lead of the
 * same person. The route must already have confirmed the opened lead and the
 * assignee are inside the viewer's hierarchy.
 */
export async function assignLeadOwner(
	idLead: number,
	idUser: number,
	ctx: CrmRequestContext
): Promise<AssignLeadOwnerResult> {
	const [lead, user] = await Promise.all([
		prisma.lead.findFirst({
			where: { idLead, active: true },
			select: { idLead: true },
		}),
		prisma.user.findFirst({
			where: { idUser, active: true },
			select: { idUser: true, name: true, lastName: true },
		}),
	])
	if (!lead) return { ok: false, error: 'Lead no encontrado' }
	if (!user) return { ok: false, error: 'El Money Strategy no existe o está inactivo' }

	const assignedLeadIds = await collectSamePersonLeadIds(idLead)
	const pending = await prisma.lead.findMany({
		where: {
			idLead: { in: assignedLeadIds },
			active: true,
			// `NOT: { idUser }` drops rows whose owner is null, so a first assignment never lands.
			OR: [{ idUser: null }, { idUser: { not: idUser } }],
		},
		select: { idLead: true, user: { select: { name: true, lastName: true } } },
	})
	const ownerName = displayName(user)
	if (pending.length > 0) {
		const changedIds = pending.map((row) => row.idLead)
		const changedAt = new Date()
		await prisma.lead.updateMany({
			where: { idLead: { in: changedIds }, active: true },
			data: { idUser, lastActivityAt: changedAt },
		})
		await recordLeadChanges(
			pending.map((row) => ({
				idLead: row.idLead,
				kind: 'OWNER',
				source: 'MANUAL',
				idActor: ctx.userId,
				fromLabel: row.user ? displayName(row.user) : null,
				toLabel: ownerName,
				changedAt,
			}))
		)
		await logAuditEvent({
			userId: ctx.userId,
			email: ctx.email,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent,
			action: AuditAction.LEAD_OWNER_ASSIGNED,
			details: `Money Strategy ${ownerName} (idUser: ${idUser}) asignado a los leads ${changedIds.join(', ')}`,
		})
	}
	return { ok: true, idUser, ownerName, assignedLeadIds }
}
