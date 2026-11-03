/**
 * GET /api/reports/commercial-dashboard
 * Funnel, KPIs, per-MS performance and stuck leads for authorized viewers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseCommercialQuery } from '@/features/reports/commercial-dashboard/lib/commercial-dashboard-route-helpers'
import { getCommercialDashboardReport } from '@/features/reports/commercial-dashboard/services/commercial-dashboard.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CommercialDashboardReport } from '@/features/reports/commercial-dashboard/types/commercial-dashboard.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<CommercialDashboardReport>>> {
	try {
		const authz = await authorizeAndParseCommercialQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getCommercialDashboardReport(authz.data)
		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener el dashboard comercial:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
