/**
 * Thin HTTP client for the Leads Analytics report API.
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
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
	range: LeadsAnalyticsDateRange
): Promise<LeadsAnalyticsReport> {
	const sp = new URLSearchParams({
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
	})
	const res = await fetch(`/api/reports/leads-analytics?${sp.toString()}`)
	return parseApiResponse<LeadsAnalyticsReport>(res)
}
