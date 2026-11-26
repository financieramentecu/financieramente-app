import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { LeadListFilterInput } from '@/features/leads/lib/build-lead-list-where'
import { resolveLeadPipelineScope } from '@/features/leads/services/lead-pipeline-scope.service'
import { getLeadAssociationGraph } from '@/features/leads/services/lead-associations.service'
import { countLeadAssociationGroups } from '@/features/leads/lib/lead-association-groups'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { EMPTY_CRM_SUMMARY, type CrmSummary } from './crm-summary.types'

export interface GetCrmSummaryQuery {
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly isBypass: boolean
	readonly filters?: LeadListFilterInput
}

/**
 * Returns bounded, hierarchy-scoped aggregates only. This deliberately never
 * selects CRM contact fields, activity payloads, or business/payment data.
 */
export async function getCrmSummary(
	query: GetCrmSummaryQuery
): Promise<CrmSummary> {
	if (!query.isBypass && query.visibleUserIds.length === 0) {
		return EMPTY_CRM_SUMMARY
	}

	const { graphWhere, filteredWhere } = await resolveLeadPipelineScope(
		query.viewer,
		{
			...query.filters,
			visibleUserIds: [...query.visibleUserIds],
		}
	)
	const leadWhere: Prisma.LeadWhereInput = {
		AND: [filteredWhere, { funnelColumn: { active: true } }],
	}
	const now = new Date()
	const [
		selectedLeads,
		graph,
		stageGroups,
		openTasks,
		overdueTasks,
		openCases,
		overdueCases,
	] = await Promise.all([
		prisma.lead.findMany({ where: leadWhere, select: { idLead: true } }),
		getLeadAssociationGraph(graphWhere),
		prisma.lead.groupBy({
			by: ['idLeadFunnelColumn'],
			where: leadWhere,
			_count: { idLead: true },
		}),
		prisma.leadTask.count({
			where: { status: 'OPEN', lead: graphWhere },
		}),
		prisma.leadTask.count({
			where: { status: 'OPEN', dueAt: { lt: now }, lead: graphWhere },
		}),
		prisma.leadSupportCase.count({
			where: {
				status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
				lead: graphWhere,
			},
		}),
		prisma.leadSupportCase.count({
			where: {
				status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
				dueAt: { lt: now },
				lead: graphWhere,
			},
		}),
	])

	const { opportunities, associatedLeadIds } = countLeadAssociationGroups(
		graph.leadIds,
		graph.links,
		selectedLeads.map((lead) => lead.idLead)
	)
	return {
		opportunities,
		associatedOpportunities: associatedLeadIds.length,
		stageCounts: stageGroups
			.map((group) => ({
				idLeadFunnelColumn: group.idLeadFunnelColumn,
				count: group._count.idLead,
			}))
			.sort(
				(left, right) => left.idLeadFunnelColumn - right.idLeadFunnelColumn
			),
		openTasks,
		overdueTasks,
		openCases,
		overdueCases,
	}
}
