import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Both endpoints must be active and visible; the graph never selects contact data. */
export async function getLeadAssociationGraph(scope: Prisma.LeadWhereInput) {
	const [leads, links] = await Promise.all([
		prisma.lead.findMany({ where: scope, select: { idLead: true } }),
		prisma.leadLink.findMany({
			where: { active: true, lead: scope, relatedLead: scope },
			select: { idLead: true, idRelatedLead: true },
		}),
	])
	return { leadIds: leads.map((lead) => lead.idLead), links }
}
