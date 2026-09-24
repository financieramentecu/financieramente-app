/**
 * Thin HTTP client for the Leads Analytics report API.
 */

import type { LeadDetail } from '@/features/leads/types/lead.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CellOwnerFilter } from './cell-owner-filter'
import { serializeCellOwnerFilter } from './cell-owner-filter'
import type {
	CellLeadList,
	CellLeadRowView,
} from '../types/heatmap-cell-leads.types'
import type {
	LeadsAnalyticsDateRange,
	LeadsAnalyticsReport,
} from '../types/leads-analytics.types'

async function parseApiResponse<T>(res: Response): Promise<T> {
	const json = (await res.json()) as ApiResponse<T>
	if (!res.ok || json.data === null) {
		const error =
			json && 'error' in json && typeof json.error === 'string'
				? json.error
				: 'Error al consultar el reporte'
		throw new Error(error)
	}
	return json.data
}

export async function fetchLeadsAnalyticsReport(
	range: LeadsAnalyticsDateRange,
	userIds: readonly number[]
): Promise<LeadsAnalyticsReport> {
	const sp = new URLSearchParams({
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
		userIds: userIds.join(','),
	})
	const res = await fetch(`/api/reports/leads-analytics?${sp.toString()}`)
	return parseApiResponse<LeadsAnalyticsReport>(res)
}

export async function fetchHeatmapCellLeads(query: {
	readonly dateFrom: string
	readonly dateTo: string
	readonly userIds: readonly number[]
	readonly idLeadFunnelColumn: number | null
	readonly ownerFilter: CellOwnerFilter
	readonly withBusiness?: boolean
	readonly outcomeStatus?: CellLeadRowView['outcomeStatus'] | null
}): Promise<CellLeadList> {
	const sp = new URLSearchParams({
		dateFrom: query.dateFrom,
		dateTo: query.dateTo,
		userIds: query.userIds.join(','),
	})
	if (query.idLeadFunnelColumn != null) {
		sp.set('idLeadFunnelColumn', String(query.idLeadFunnelColumn))
	}
	if (query.withBusiness) {
		sp.set('withBusiness', 'true')
	}
	if (query.outcomeStatus) {
		sp.set('outcomeStatus', query.outcomeStatus)
	}
	const serializedOwner = serializeCellOwnerFilter(query.ownerFilter)
	if (serializedOwner !== undefined) {
		sp.set('idUser', serializedOwner)
	}
	const res = await fetch(
		`/api/reports/leads-analytics/cell-leads?${sp.toString()}`
	)
	return parseApiResponse(res)
}

export async function fetchLeadDetail(idLead: number): Promise<LeadDetail> {
	const res = await fetch(`/api/leads/${idLead}`)
	return parseApiResponse<LeadDetail>(res)
}
