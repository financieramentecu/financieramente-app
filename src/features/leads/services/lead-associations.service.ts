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

/** Only visible active endpoints contribute to a person's read projection. */
export async function getVisiblePersonGroupIds(
	idLead: number,
	scope: Prisma.LeadWhereInput
): Promise<number[]> {
	const graph = await getLeadAssociationGraph(scope)
	const { countLeadAssociationGroups } =
		await import('@/features/leads/lib/lead-association-groups')
	return (
		countLeadAssociationGroups(graph.leadIds, graph.links).groups.find((ids) =>
			ids.includes(idLead)
		) ?? []
	)
}
