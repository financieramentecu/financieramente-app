/**
 * GET /api/reports/leads-analytics
 * Follow-up bars, converted-lead slices, and MS heatmap for authorized viewers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseLeadsAnalyticsQuery } from '@/features/reports/leads-analytics/lib/leads-analytics-route-helpers'
import { getLeadsAnalyticsReport } from '@/features/reports/leads-analytics/services/leads-analytics.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadsAnalyticsReport } from '@/features/reports/leads-analytics/types/leads-analytics.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<LeadsAnalyticsReport>>> {
	try {
		const authz = await authorizeAndParseLeadsAnalyticsQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getLeadsAnalyticsReport(authz.data)
		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener analítica de leads:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
