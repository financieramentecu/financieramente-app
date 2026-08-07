import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import type { LeadViewer } from '@/features/leads/types/lead.types'

export interface LeadForConversionOptions {
	visibleUserIds?: number[]
}

const leadForConversionInclude = {
	user: { include: { role: true, category: true } },
} satisfies Prisma.LeadInclude

/** A lead resolved for conversion, including its owner (role + category) for R1 agent defaulting. */
export type LeadWithOwner = Prisma.LeadGetPayload<{
	include: typeof leadForConversionInclude
}>

/**
 * Resolves a lead for manual conversion, scoped to the viewer's hierarchy
 * and excluding: already-converted leads (`idBusiness != null` — a lead
 * with `idBusiness` set cannot start a second conversion) and ownerless
 * leads (`idUser == null` — a lead must have a Money Strategist assigned
 * before it can become a business; the resulting business's `agent` is
 * defaulted to and locked to that owner). Includes the owner (`user` +
 * `role` + `category`) in the same query so the caller can build the
 * `AgentInfo` used to default/lock the business form's `agent` field.
 */
export async function getLeadForConversion(
	idLead: number,
	viewer: LeadViewer,
	options: LeadForConversionOptions = {}
): Promise<LeadWithOwner | null> {
	const where = buildLeadListWhere(viewer, {}, options)
	const scopedConditions = Array.isArray(where.AND) ? where.AND : []

	return prisma.lead.findFirst({
		where: {
			...where,
			AND: [
				...scopedConditions,
				{ idLead },
				{ idBusiness: null },
				{ idUser: { not: null } },
			],
		},
		include: leadForConversionInclude,
	})
}

/**
 * Links a lead to the just-created business, inside the caller's existing
 * `$transaction`. Re-checks `idBusiness == null` at write time so a
 * concurrent double conversion rolls back the whole transaction (no
 * duplicate `Business` created) instead of silently overwriting the link —
 * the `@unique` on `Lead.idBusiness` is the final DB-level backstop.
 */
export async function linkLeadToBusinessTx(
	tx: Prisma.TransactionClient,
	idLead: number,
	idBusiness: number
): Promise<void> {
	const current = await tx.lead.findUnique({ where: { idLead } })

	if (!current || !current.active || current.idBusiness != null) {
		throw new Error(
			'El lead ya fue convertido a negocio o no está disponible para conversión'
		)
	}

	if (current.idUser == null) {
		throw new Error(
			'El lead no tiene un owner asignado y no puede convertirse a negocio'
		)
	}

	await tx.lead.update({
		where: { idLead },
		data: { idBusiness },
	})
}
