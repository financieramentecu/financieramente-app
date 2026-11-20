import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadTableWhere, resolveLeadTableOptions } from '@/features/leads/table/build-lead-table-where'
import { DEFAULT_LEAD_TABLE_QUERY } from '@/features/leads/table/lead-table-query.schema'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { buildCrmPipelineReport } from '@/features/leads/reports/build-crm-pipeline-report'
import type {
	CrmPipelineReport,
	CrmReportLead,
	CrmReportOwner,
	CrmReportQuery,
} from '@/features/leads/reports/crm-pipeline-report.types'

/** Max leads in one report; above it the caller must narrow the range or owners. */
export const CRM_REPORT_LEAD_LIMIT = 20_000

export type CrmPipelineReportResult =
	| { ok: true; report: CrmPipelineReport }
	| { ok: false; reason: 'TOO_MANY_LEADS'; total: number }

/** Aggregate-only projection: never contact fields. */
const leadSelect = {
	idLead: true,
	idUser: true,
	idLeadFunnelColumn: true,
	outcomeStatus: true,
	originTag: true,
	estimatedValue: true,
	probability: true,
	createdAt: true,
} satisfies Prisma.LeadSelect

function fullName(user: { name: string; lastName: string | null }): string {
	return [user.name, user.lastName].filter(Boolean).join(' ')
}

/** Same lead set the Leads table shows for this range and owners. */
export function buildCrmReportLeadWhere(
	viewer: LeadViewer,
	query: CrmReportQuery,
	visibleUserIds: number[],
	now: Date
): Prisma.LeadWhereInput {
	return buildLeadTableWhere(
		viewer,
		{ ...DEFAULT_LEAD_TABLE_QUERY, from: query.from, to: query.to, ownerIds: [...query.ownerIds] },
		resolveLeadTableOptions(visibleUserIds, now)
	)
}

async function loadOwners(leads: readonly CrmReportLead[]): Promise<CrmReportOwner[]> {
	const ids = [...new Set(leads.flatMap((lead) => (lead.idUser === null ? [] : [lead.idUser])))]
	if (ids.length === 0) return []
	const users = await prisma.user.findMany({
		where: { idUser: { in: ids } },
		select: {
			idUser: true,
			name: true,
			lastName: true,
			leader: { select: { idUser: true, name: true, lastName: true } },
		},
	})
	return users.map((user) => ({
		idUser: user.idUser,
		name: fullName(user),
		idLeader: user.leader?.idUser ?? null,
		leaderName: user.leader ? fullName(user.leader) : null,
	}))
}

/** CRM pipeline report for the viewer's hierarchy, bounded to {@link CRM_REPORT_LEAD_LIMIT} leads. */
export async function getCrmPipelineReport(
	viewer: LeadViewer,
	query: CrmReportQuery,
	visibleUserIds: number[],
	now: Date = new Date()
): Promise<CrmPipelineReportResult> {
	const where = buildCrmReportLeadWhere(viewer, query, visibleUserIds, now)
	const total = await prisma.lead.count({ where })
	if (total > CRM_REPORT_LEAD_LIMIT) return { ok: false, reason: 'TOO_MANY_LEADS', total }

	const [records, stageChanges, stages] = await Promise.all([
		prisma.lead.findMany({ where, select: leadSelect }),
		prisma.leadStageHistory.findMany({
			where: { lead: where },
			select: { idLead: true, fromIdLeadFunnelColumn: true, toIdLeadFunnelColumn: true, changedAt: true },
			orderBy: [{ idLead: 'asc' }, { changedAt: 'asc' }],
		}),
		prisma.leadFunnelColumn.findMany({
			select: { idLeadFunnelColumn: true, name: true, position: true, active: true, isFallback: true },
		}),
	])
	const leads: CrmReportLead[] = records.map((record) => ({
		...record,
		estimatedValue: record.estimatedValue ? record.estimatedValue.toDecimalPlaces(2).toString() : null,
	}))
	const owners = await loadOwners(leads)

	return {
		ok: true,
		report: buildCrmPipelineReport({
			range: { from: query.from, to: query.to },
			leads,
			stageChanges,
			stages,
			owners,
		}),
	}
}
