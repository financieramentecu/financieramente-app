/**
 * GET /api/reports/leads-analytics/cell-leads
 * Lead rows for one funnel column (optional owner) in the heatmap/bars.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseLeadsAnalyticsCellQuery } from '@/features/reports/leads-analytics/lib/leads-analytics-route-helpers'
import { getHeatmapCellLeads } from '@/features/reports/leads-analytics/services/heatmap-cell-leads.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CellLeadList } from '@/features/reports/leads-analytics/types/heatmap-cell-leads.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<CellLeadList>>> {
	try {
		const authz = await authorizeAndParseLeadsAnalyticsCellQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getHeatmapCellLeads({
			range: authz.data.range,
			viewer: authz.data.viewer,
			visibleUserIds: authz.data.visibleUserIds,
			idLeadFunnelColumn: authz.data.cell.idLeadFunnelColumn,
			ownerFilter: authz.data.cell.ownerFilter,
			withBusiness: authz.data.cell.withBusiness,
			outcomeStatus: authz.data.cell.outcomeStatus,
		})
		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener leads de la celda:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
