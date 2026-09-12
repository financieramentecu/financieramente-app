/**
 * GET /api/reports/aba-mfund/ranking
 * Top 6 ABA por Agente with embedded businesses for expand-row.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authorizeAndParseAbaMfundQuery } from '@/features/reports/aba-mfund/lib/aba-mfund-route-helpers'
import { getAbaMfundRanking } from '@/features/reports/aba-mfund/services/aba-mfund-ranking.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AbaMfundRanking } from '@/features/reports/aba-mfund/types/aba-mfund.types'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<AbaMfundRanking>>> {
	try {
		const authz = await authorizeAndParseAbaMfundQuery(req)
		if (!authz.ok) {
			return authz.response
		}

		const data = await getAbaMfundRanking({
			filters: authz.data.filters,
		})

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener ranking de ABA-MFUND:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
