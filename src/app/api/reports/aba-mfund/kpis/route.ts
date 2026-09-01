/**
 * GET /api/reports/aba-mfund/kpis
 * Aggregates ABA Total / Fondeado / Emitido / Ticket promedio for authorized viewers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseAbaMfundQuery } from '@/features/reports/aba-mfund/lib/aba-mfund-route-helpers'
import { getAbaMfundKpis } from '@/features/reports/aba-mfund/services/aba-mfund-kpi.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AbaMfundKpis } from '@/features/reports/aba-mfund/types/aba-mfund.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<AbaMfundKpis>>> {
	try {
		const authz = await authorizeAndParseAbaMfundQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getAbaMfundKpis({
			filters: authz.data.filters,
		})

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener KPIs de ABA-MFUND:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
