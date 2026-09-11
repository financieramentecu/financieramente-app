/**
 * Lead rows for one funnel column (optional owner) in Leads Analytics.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { LEAD_OUTCOME_STATUS_LABELS } from '@/features/leads/lib/lead-outcome-status'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { parseBogotaInclusiveUtcRange } from '@/features/shared/lib/bogota-date-range'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import {
	CELL_OWNER_SENTINEL,
	isAssignedOwner,
	type CellOwnerFilter,
} from '../lib/cell-owner-filter'
import { formatOwnerName } from '../lib/format-owner-name'
import { LEADS_ANALYTICS_UI } from '../lib/ui-copy'
import type { LeadViewer } from '@/features/leads/types/lead.types'
import type { LeadsAnalyticsDateRange } from '../types/leads-analytics.types'
import {
	HEATMAP_CELL_LEADS_CAP,
	type CellLeadList,
	type CellLeadRowView,
} from '../types/heatmap-cell-leads.types'

export interface GetHeatmapCellLeadsQuery {
	readonly range: LeadsAnalyticsDateRange
	readonly viewer: LeadViewer
	readonly visibleUserIds: readonly number[]
	readonly idLeadFunnelColumn: number | null
	readonly ownerFilter: CellOwnerFilter
	readonly withBusiness?: boolean
	readonly outcomeStatus?: CellLeadRowView['outcomeStatus'] | null
}

function formatLeadName(
	name: string | null,
	lastName: string | null
): string {
	const joined = [name, lastName].filter(Boolean).join(' ')
	return joined || LEADS_ANALYTICS_UI.UNNAMED_LEAD
}

function mapLeadRow(row: {
	idLead: number
	name: string | null
	lastName: string | null
	outcomeStatus: CellLeadRowView['outcomeStatus']
	createdAt: Date
	idBusiness: number | null
	user: { name: string; lastName: string | null } | null
}): CellLeadRowView {
	return {
		idLead: row.idLead,
		leadName: formatLeadName(row.name, row.lastName),
		ownerName: row.user
			? formatOwnerName(row.user)
			: LEADS_ANALYTICS_UI.UNASSIGNED_OWNER,
		outcomeStatus: row.outcomeStatus,
		outcomeLabel: LEAD_OUTCOME_STATUS_LABELS[row.outcomeStatus],
		createdAtLabel: formatDateBogota(row.createdAt),
		idBusiness: row.idBusiness,
	}
}

function ownerWhere(
	ownerFilter: CellOwnerFilter,
	visibleUserIds: readonly number[]
): Prisma.LeadWhereInput {
	if (ownerFilter === CELL_OWNER_SENTINEL.UNASSIGNED) {
		return { idUser: null }
	}
	if (ownerFilter === CELL_OWNER_SENTINEL.ALL) {
		return { idUser: { in: [...visibleUserIds] } }
	}
	return { idUser: ownerFilter }
}

/**
 * Returns leads for a follow-up column, optionally scoped to one owner.
 * Empty hierarchy short-circuits with no Prisma call.
 */
export async function getHeatmapCellLeads(
	query: GetHeatmapCellLeadsQuery
): Promise<CellLeadList> {
	if (query.visibleUserIds.length === 0) {
		return { leads: [], total: 0, isTruncated: false }
	}

	if (
		isAssignedOwner(query.ownerFilter) &&
		!query.visibleUserIds.includes(query.ownerFilter)
	) {
		return { leads: [], total: 0, isTruncated: false }
	}

	const createdAtRange = parseBogotaInclusiveUtcRange(
		query.range.dateFrom,
		query.range.dateTo
	)

	const baseWhere = buildLeadListWhere(
		query.viewer,
		{ createdAtRange },
		{ visibleUserIds: [...query.visibleUserIds] }
	)

	const ownerFilter: Prisma.LeadWhereInput = ownerWhere(query.ownerFilter, query.visibleUserIds)
	const extraFilters: Prisma.LeadWhereInput[] = [baseWhere, ownerFilter]
	if (query.idLeadFunnelColumn != null) {
		extraFilters.push({ idLeadFunnelColumn: query.idLeadFunnelColumn })
	}
	if (query.withBusiness) {
		extraFilters.push({ idBusiness: { not: null } })
	}
	if (query.outcomeStatus) {
		extraFilters.push({ outcomeStatus: query.outcomeStatus })
	}

	const where: Prisma.LeadWhereInput = {
		AND: extraFilters,
	}

	const [total, rows] = await Promise.all([
		prisma.lead.count({ where }),
		prisma.lead.findMany({
			where,
			orderBy: [{ createdAt: 'desc' }, { idLead: 'desc' }],
			take: HEATMAP_CELL_LEADS_CAP,
			select: {
				idLead: true,
				name: true,
				lastName: true,
				outcomeStatus: true,
				createdAt: true,
				idBusiness: true,
				user: { select: { name: true, lastName: true } },
			},
		}),
	])

	return {
		leads: rows.map(mapLeadRow),
		total,
		isTruncated: total > rows.length,
	}
}
