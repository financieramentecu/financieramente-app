import type { Prisma, Lead } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import type { LeadViewer } from '@/features/leads/types/lead.types'

export interface LeadForConversionOptions {
	visibleUserIds?: number[]
}

/**
 * Resolves a lead for manual conversion, scoped to the viewer's hierarchy
 * and excluding already-converted leads (`idBusiness != null`) — a lead
 * with `idBusiness` set cannot start a second conversion.
 */
export async function getLeadForConversion(
	idLead: number,
	viewer: LeadViewer,
	options: LeadForConversionOptions = {}
): Promise<Lead | null> {
	const where = buildLeadListWhere(viewer, {}, options)
	const scopedConditions = Array.isArray(where.AND) ? where.AND : []

	return prisma.lead.findFirst({
		where: {
			...where,
			AND: [...scopedConditions, { idLead }, { idBusiness: null }],
		},
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

	await tx.lead.update({
		where: { idLead },
		data: { idBusiness },
	})
}
