/**
 * GET /api/reports/aba-mfund/detail
 * Cursor-paginated detail rows for continuous-scroll table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseAbaMfundQuery } from '@/features/reports/aba-mfund/lib/aba-mfund-route-helpers'
import { encodeDetailCursor } from '@/features/reports/aba-mfund/lib/aba-mfund-schemas'
import { getAbaMfundDetail } from '@/features/reports/aba-mfund/services/aba-mfund-detail.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AbaMfundDetailApiPage } from '@/features/reports/aba-mfund/types/aba-mfund.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<AbaMfundDetailApiPage>>> {
	try {
		const authz = await authorizeAndParseAbaMfundQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const page = await getAbaMfundDetail({
			filters: authz.data.filters,
			cursor: authz.data.cursor,
			limit: authz.data.limit,
		})

		const data: AbaMfundDetailApiPage = {
			rows: page.rows,
			nextCursor: page.nextCursor
				? encodeDetailCursor(page.nextCursor)
				: null,
			hasMore: page.hasMore,
		}

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener detalle de ABA-MFUND:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
