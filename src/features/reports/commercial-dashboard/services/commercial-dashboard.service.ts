/**
 * Data loading for the Commercial Dashboard.
 * Hierarchy-scoped via buildLeadListWhere; empty non-bypass scope → empty report.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { formatOwnerName } from '@/features/reports/leads-analytics/lib/format-owner-name'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import { buildCommercialReport, buildPeriodTotals } from '../lib/build-commercial-report'
import { previousRange } from '../lib/previous-range'
import { buildPipelineWhere, NO_PIPELINE } from '../lib/pipeline-filter'
import { EMPTY_COMMERCIAL_DASHBOARD_REPORT } from '../lib/empty-report'
import type {
	CommercialDashboardReport,
	CommercialDateRange,
} from '../types/commercial-dashboard.types'

export interface GetCommercialDashboardQuery {
	readonly range: CommercialDateRange
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly isBypass: boolean
	/** Selected pipelines; empty = all. */
	readonly pipelines: readonly string[]
}

function scopeWhere(
	query: GetCommercialDashboardQuery,
	createdAtRange?: { gte: Date; lte: Date }
): Prisma.LeadWhereInput {
	const base = buildLeadListWhere(
		query.viewer,
		{ createdAtRange },
		{ visibleUserIds: [...query.visibleUserIds] }
	)
	return query.isBypass
		? { AND: [base, { idUser: { in: [...query.visibleUserIds] } }] }
		: base
}

export async function getCommercialDashboardReport(
	query: GetCommercialDashboardQuery
): Promise<CommercialDashboardReport> {
	if (query.visibleUserIds.length === 0) {
		return EMPTY_COMMERCIAL_DASHBOARD_REPORT
	}

	const createdAtRange = parseBogotaInclusiveUtcRange(
		query.range.dateFrom,
		query.range.dateTo
	)
	const pipelineWhere = buildPipelineWhere(query.pipelines)
	const withPipeline = (where: Prisma.LeadWhereInput): Prisma.LeadWhereInput =>
		pipelineWhere ? { AND: [where, pipelineWhere] } : where
	const cohortWhere = withPipeline(scopeWhere(query, createdAtRange))
	const prevRange = previousRange(query.range)
	const prevWhere = withPipeline(
		scopeWhere(query, parseBogotaInclusiveUtcRange(prevRange.dateFrom, prevRange.dateTo))
	)
	const openWhere: Prisma.LeadWhereInput = withPipeline({
		AND: [scopeWhere(query, createdAtRange), { outcomeStatus: 'OPEN' }],
	})

	const [columns, leads, stuckRows, unassigned, pipelineGroups, prevLeads] = await Promise.all([
		prisma.leadFunnelColumn.findMany({
			where: { active: true },
			orderBy: { position: 'asc' },
			select: {
				idLeadFunnelColumn: true,
				name: true,
				externalStatusKey: true,
				position: true,
			},
		}),
		prisma.lead.findMany({
			where: cohortWhere,
			select: {
				idLead: true,
				idUser: true,
				createdAt: true,
				outcomeStatus: true,
				idLeadFunnelColumn: true,
				originTag: true,
				idBusiness: true,
			},
		}),
		prisma.lead.findMany({
			where: openWhere,
			select: {
				idLead: true,
				idUser: true,
				name: true,
				lastName: true,
				idLeadFunnelColumn: true,
				updatedAt: true,
			},
		}),
		query.isBypass
			? prisma.lead.count({
					where: withPipeline({
						AND: [
							buildLeadListWhere(query.viewer, { createdAtRange }),
							{ idUser: null },
						],
					}),
				})
			: Promise.resolve(0),
		prisma.lead.groupBy({
			by: ['originTag'],
			where: scopeWhere(query, createdAtRange),
			_count: { idLead: true },
		}),
		prisma.lead.findMany({
			where: prevWhere,
			select: {
				idLead: true,
				idUser: true,
				createdAt: true,
				outcomeStatus: true,
				idLeadFunnelColumn: true,
				idBusiness: true,
				originTag: true,
			},
		}),
	])

	// shortcut: the UI shows only CRM data while the business base is structured; before
	// showing these again, exclude MFUND and inactive businesses as the team's report does.
	const businessIds = [...leads, ...prevLeads]
		.map((lead) => lead.idBusiness)
		.filter((idBusiness): idBusiness is number => idBusiness != null)
	const [events, businessRows] = await Promise.all([
		prisma.leadStageEvent.findMany({
			where: { idLead: { in: leads.map((lead) => lead.idLead) } },
			select: { idLead: true, toColumnId: true, occurredAt: true },
		}),
		businessIds.length === 0
			? Promise.resolve([])
			: prisma.business.findMany({
					where: { idBusiness: { in: businessIds } },
					select: {
						idBusiness: true,
						status: true,
						createdAt: true,
						dateAnchored: true,
						value: true,
						currency: { select: { symbol: true } },
					},
				}),
	])
	const businesses = businessRows.map((b) => ({
		idBusiness: b.idBusiness,
		status: b.status,
		createdAt: b.createdAt,
		dateAnchored: b.dateAnchored,
		value: Number(b.value),
		currency: b.currency.symbol,
	}))

	const ownerIds = [
		...new Set(
			[...leads, ...stuckRows]
				.map((lead) => lead.idUser)
				.filter((idUser): idUser is number => idUser != null)
		),
	]
	const owners =
		ownerIds.length === 0
			? []
			: (
					await prisma.user.findMany({
						where: { idUser: { in: ownerIds } },
						select: { idUser: true, name: true, lastName: true },
					})
				).map((user) => ({ idUser: user.idUser, name: formatOwnerName(user) }))

	return buildCommercialReport({
		leads,
		events,
		columns,
		owners,
		stuckCandidates: stuckRows.map((row) => ({
			idLead: row.idLead,
			idUser: row.idUser,
			name: [row.name, row.lastName].filter(Boolean).join(' '),
			idLeadFunnelColumn: row.idLeadFunnelColumn,
			updatedAt: row.updatedAt,
		})),
		unassigned,
		pipelines: pipelineGroups
			.map((group) => ({
				name: group.originTag ?? NO_PIPELINE,
				count: group._count.idLead,
			}))
			.sort((a, b) => b.count - a.count),
		businesses,
		previous: buildPeriodTotals(prevRange, prevLeads, businesses),
		previousLeads: prevLeads,
		now: new Date(),
	})
}
