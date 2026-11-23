import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { EMPTY_CRM_SUMMARY, type CrmSummary } from './crm-summary.types'

export interface GetCrmSummaryQuery {
  readonly viewer: LeadViewer
  readonly visibleUserIds: readonly number[]
  readonly isBypass: boolean
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

  const leadWhere: Prisma.LeadWhereInput = buildLeadListWhere(
    query.viewer,
    {},
    { visibleUserIds: [...query.visibleUserIds] }
  )
  const now = new Date()
  const [opportunities, stageGroups, openTasks, overdueTasks, openCases, overdueCases] =
    await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.groupBy({
        by: ['idLeadFunnelColumn'],
        where: leadWhere,
        _count: { idLead: true },
      }),
      prisma.leadTask.count({
        where: { status: 'OPEN', lead: leadWhere },
      }),
      prisma.leadTask.count({
        where: { status: 'OPEN', dueAt: { lt: now }, lead: leadWhere },
      }),
      prisma.leadSupportCase.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] }, lead: leadWhere },
      }),
      prisma.leadSupportCase.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
          dueAt: { lt: now },
          lead: leadWhere,
        },
      }),
    ])

  return {
    opportunities,
    stageCounts: stageGroups
      .map((group) => ({
        idLeadFunnelColumn: group.idLeadFunnelColumn,
        count: group._count.idLead,
      }))
      .sort((left, right) => left.idLeadFunnelColumn - right.idLeadFunnelColumn),
    openTasks,
    overdueTasks,
    openCases,
    overdueCases,
  }
}
