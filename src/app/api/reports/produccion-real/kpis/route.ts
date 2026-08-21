/**
 * GET /api/reports/produccion-real/kpis
 * Aggregates Producción Real / Regular / Único / Fondeado for authorized viewers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseProduccionRealQuery } from '@/features/reports/produccion-real/lib/produccion-real-route-helpers'
import { getProduccionRealKpis } from '@/features/reports/produccion-real/services/produccion-real-kpi.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProduccionRealKpis } from '@/features/reports/produccion-real/types/produccion-real.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<ProduccionRealKpis>>> {
	try {
		const authz = await authorizeAndParseProduccionRealQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getProduccionRealKpis({
			filters: authz.data.filters,
			trmRate: authz.data.trmRate,
		})

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener KPIs de Producción Real:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
