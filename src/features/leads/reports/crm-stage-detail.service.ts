import { prisma } from '@/lib/prisma'
import {
	buildCrmStageDetailLeads,
	buildCrmStageDetailRows,
	filterCrmStageDetailLeads,
	listCrmStageDetailStages,
	type CrmStageDetailLeadInput,
} from '@/features/leads/reports/build-crm-stage-detail'
import {
	buildCrmReportLeadWhere,
	CRM_REPORT_LEAD_LIMIT,
} from '@/features/leads/reports/crm-pipeline-report.service'
import type { CrmReportQuery } from '@/features/leads/reports/crm-pipeline-report.types'
import type {
	CrmStageDetailFilter,
	CrmStageDetailLead,
	CrmStageDetailPage,
	CrmStageDetailRow,
} from '@/features/leads/reports/crm-stage-detail.types'
import type { LeadViewer } from '@/features/leads/types/lead.types'

export type CrmStageDetailResult =
	| { ok: true; rows: CrmStageDetailRow[] }
	| { ok: false; reason: 'TOO_MANY_LEADS' }

export type CrmStageDetailLeadResult =
	| { ok: true; leads: CrmStageDetailLead[] }
	| { ok: false; reason: 'TOO_MANY_LEADS' }

function displayName(name: string | null, lastName: string | null, fallback: string): string {
	const full = [name, lastName].filter(Boolean).join(' ')
	return full || fallback
}

async function loadCrmStageDetailInputs(
	viewer: LeadViewer,
	query: CrmReportQuery,
	visibleUserIds: number[],
	now: Date
): Promise<
	| { ok: true; leads: CrmStageDetailLeadInput[] }
	| { ok: false; reason: 'TOO_MANY_LEADS' }
> {
	const where = buildCrmReportLeadWhere(viewer, query, visibleUserIds, now)
	const total = await prisma.lead.count({ where })
	if (total > CRM_REPORT_LEAD_LIMIT) return { ok: false, reason: 'TOO_MANY_LEADS' }

	const records = await prisma.lead.findMany({
		where,
		select: {
			idLead: true,
			name: true,
			lastName: true,
			createdAt: true,
			idUser: true,
			funnelColumn: { select: { name: true } },
			user: { select: { name: true, lastName: true } },
			stageHistory: {
				orderBy: { changedAt: 'asc' },
				select: {
					changedAt: true,
					fromColumn: { select: { name: true } },
					toColumn: { select: { name: true } },
				},
			},
			tasks: {
				orderBy: { createdAt: 'asc' },
				select: { title: true, status: true, completedAt: true },
			},
			supportCases: {
				orderBy: { createdAt: 'asc' },
				select: { subject: true, status: true, resolvedAt: true },
			},
		},
	})

	return {
		ok: true,
		leads: records.map((record) => ({
			idLead: record.idLead,
			leadName: displayName(record.name, record.lastName, `Lead ${record.idLead}`),
			advisorName: record.user
				? displayName(record.user.name, record.user.lastName, `Usuario ${record.idUser}`)
				: 'Sin asignar',
			createdAt: record.createdAt,
			currentColumnName: record.funnelColumn.name,
			events: record.stageHistory.map((event) => ({
				fromColumnName: event.fromColumn?.name ?? null,
				toColumnName: event.toColumn.name,
				changedAt: event.changedAt,
			})),
			tasks: record.tasks,
			cases: record.supportCases,
		})),
	}
}

/** Every stage stay for the leads in the report range, scoped like the pipeline report. */
export async function getCrmStageDetailRows(
	viewer: LeadViewer,
	query: CrmReportQuery,
	visibleUserIds: number[],
	now: Date = new Date()
): Promise<CrmStageDetailResult> {
	const loaded = await loadCrmStageDetailInputs(viewer, query, visibleUserIds, now)
	if (!loaded.ok) return loaded
	return { ok: true, rows: buildCrmStageDetailRows(loaded.leads, now) }
}

/** Grouped leads for the on-screen table, including tasks and support cases. */
export async function getCrmStageDetailLeads(
	viewer: LeadViewer,
	query: CrmReportQuery,
	visibleUserIds: number[],
	now: Date = new Date()
): Promise<CrmStageDetailLeadResult> {
	const loaded = await loadCrmStageDetailInputs(viewer, query, visibleUserIds, now)
	if (!loaded.ok) return loaded
	return { ok: true, leads: buildCrmStageDetailLeads(loaded.leads, now) }
}

export function pageCrmStageDetailLeads(
	leads: readonly CrmStageDetailLead[],
	query: CrmReportQuery,
	filter: CrmStageDetailFilter,
	page: number,
	pageSize: number
): CrmStageDetailPage {
	const filtered = filterCrmStageDetailLeads(leads, filter)
	const start = (page - 1) * pageSize
	return {
		range: { from: query.from, to: query.to },
		stages: listCrmStageDetailStages(leads),
		view: filter.view,
		stage: filter.stage,
		leads: filtered.slice(start, start + pageSize),
		page,
		pageSize,
		totalLeads: filtered.length,
	}
}
