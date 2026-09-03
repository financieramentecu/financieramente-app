/**
 * KPI aggregation for the Leads Analytics report.
 * Hierarchy-scoped via buildLeadListWhere; empty non-bypass scope → zeros.
 */

import type { LeadOutcomeStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { EMPTY_LEADS_ANALYTICS_REPORT } from '../lib/empty-report'
import {
	buildConvertedMetric,
	buildFollowUpBars,
	buildHeatmap,
} from '../lib/build-report-view'
import { formatOwnerName } from '../lib/format-owner-name'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import type {
	FunnelColumnRef,
	HeatmapRawCell,
	LeadsAnalyticsDateRange,
	LeadsAnalyticsReport,
	OwnerRef,
} from '../types/leads-analytics.types'

export interface GetLeadsAnalyticsQuery {
	readonly range: LeadsAnalyticsDateRange
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly isBypass: boolean
}

/**
 * Aggregates follow-up bars, converted-lead slices, and the MS heatmap.
 */
export async function getLeadsAnalyticsReport(
	query: GetLeadsAnalyticsQuery
): Promise<LeadsAnalyticsReport> {
	if (!query.isBypass && query.visibleUserIds.length === 0) {
		return EMPTY_LEADS_ANALYTICS_REPORT
	}

	const createdAtRange = parseBogotaInclusiveUtcRange(
		query.range.dateFrom,
		query.range.dateTo
	)

	const where = buildLeadListWhere(
		query.viewer,
		{ createdAtRange },
		{ visibleUserIds: [...query.visibleUserIds] }
	)

	const convertedWhere: Prisma.LeadWhereInput = {
		AND: [where, { idBusiness: { not: null } }],
	}

	const [columns, followUpGroups, convertedGroups, heatmapGroups] =
		await Promise.all([
			prisma.leadFunnelColumn.findMany({
				where: { active: true },
				orderBy: { position: 'asc' },
				select: {
					idLeadFunnelColumn: true,
					name: true,
					position: true,
				},
			}),
			prisma.lead.groupBy({
				by: ['idLeadFunnelColumn'],
				where,
				_count: { idLead: true },
			}),
			prisma.lead.groupBy({
				by: ['outcomeStatus'],
				where: convertedWhere,
				_count: { idLead: true },
			}),
			prisma.lead.groupBy({
				by: ['idUser', 'idLeadFunnelColumn'],
				where,
				_count: { idLead: true },
			}),
		])

	const funnelColumns: FunnelColumnRef[] = columns

	const countsByColumn = new Map<number, number>()
	for (const group of followUpGroups) {
		countsByColumn.set(group.idLeadFunnelColumn, group._count.idLead)
	}

	const countsByOutcome = new Map<LeadOutcomeStatus, number>()
	for (const group of convertedGroups) {
		countsByOutcome.set(group.outcomeStatus, group._count.idLead)
	}

	const heatmapCells: HeatmapRawCell[] = heatmapGroups.map((group) => ({
		idUser: group.idUser,
		idLeadFunnelColumn: group.idLeadFunnelColumn,
		count: group._count.idLead,
	}))

	const ownerIds = [
		...new Set(
			heatmapCells
				.map((cell) => cell.idUser)
				.filter((idUser): idUser is number => idUser != null)
		),
	]

	const owners: OwnerRef[] =
		ownerIds.length === 0
			? []
			: (
					await prisma.user.findMany({
						where: { idUser: { in: ownerIds } },
						select: { idUser: true, name: true, lastName: true },
					})
				).map((user) => ({
					idUser: user.idUser,
					name: formatOwnerName(user),
				}))

	return {
		followUpBars: buildFollowUpBars(funnelColumns, countsByColumn),
		converted: buildConvertedMetric(countsByOutcome),
		heatmap: buildHeatmap(funnelColumns, heatmapCells, owners),
	}
}
