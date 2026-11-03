/**
 * Thin HTTP client for the Commercial Dashboard report API.
 */

import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { COMMERCIAL_DASHBOARD_UI } from './ui-copy'
import type {
	CommercialDashboardReport,
	CommercialDateRange,
} from '../types/commercial-dashboard.types'

export async function fetchCommercialDashboardReport(
	range: CommercialDateRange,
	userIds: readonly number[],
	pipelines: readonly string[] = []
): Promise<CommercialDashboardReport> {
	const sp = new URLSearchParams({
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
		userIds: userIds.join(','),
	})
	for (const name of pipelines) sp.append('pipeline', name)
	const res = await fetch(`/api/reports/commercial-dashboard?${sp.toString()}`)
	const json = (await res.json()) as ApiResponse<CommercialDashboardReport>
	if (!res.ok || json.data === null) {
		throw new Error(
			json && 'error' in json && typeof json.error === 'string'
				? json.error
				: COMMERCIAL_DASHBOARD_UI.ERROR_REPORT
		)
	}
	return json.data
}
