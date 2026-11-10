/**
 * API Route: /api/negocios/stats
 * GET - Obtener estadísticas de negocios para el dashboard (Resumen KPIs)
 *
 * Acepta los mismos filtros avanzados que GET /api/negocios (BusinessFilterParams).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CoachKpiResponse } from '@/features/negocios/types/business-api.types'
import { businessFilterParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import { parseBusinessFilterQuery } from '@/features/negocios/lib/parse-business-list-query'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getBusinessStats } from '@/features/negocios/services/business-stats.service'
import { prisma } from '@/lib/prisma'

export async function GET(
	req: NextRequest
): Promise<NextResponse<ApiResponse<CoachKpiResponse>>> {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const { searchParams } = new URL(req.url)
		const validationResult = businessFilterParamsSchema.safeParse(
			parseBusinessFilterQuery(searchParams)
		)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.message || 'Parámetros inválidos',
				},
				{ status: 400 }
			)
		}

		const data = await getBusinessStats(
			prisma,
			currentUser,
			validationResult.data
		)

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al obtener estadísticas:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
