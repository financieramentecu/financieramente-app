/**
 * GET /api/reports/produccion-real/detail
 * Cursor-paginated detail rows for continuous-scroll table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseProduccionRealQuery } from '@/features/reports/produccion-real/lib/produccion-real-route-helpers'
import { encodeDetailCursor } from '@/features/reports/produccion-real/lib/produccion-real-schemas'
import { getProduccionRealDetail } from '@/features/reports/produccion-real/services/produccion-real-detail.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProduccionRealDetailPage } from '@/features/reports/produccion-real/types/produccion-real.types'

interface ProduccionRealDetailApiPage {
	readonly rows: ProduccionRealDetailPage['rows']
	readonly nextCursor: string | null
	readonly hasMore: boolean
}

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<ProduccionRealDetailApiPage>>> {
	try {
		const authz = await authorizeAndParseProduccionRealQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const page = await getProduccionRealDetail({
			filters: authz.data.filters,
			trmRate: authz.data.trmRate,
			cursor: authz.data.cursor,
			limit: authz.data.limit,
		})

		const data: ProduccionRealDetailApiPage = {
			rows: page.rows,
			nextCursor: page.nextCursor
				? encodeDetailCursor(page.nextCursor)
				: null,
			hasMore: page.hasMore,
		}

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener detalle de Producción Real:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
