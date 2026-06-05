/**
 * GET /api/periodicities
 * Returns all buy periodicities ordered by name.
 * Requires authentication.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { PeriodicityDto } from '@/features/negocios/services/periodicity.service'
import { listPeriodicities } from '@/features/negocios/services/periodicity.service'

export async function GET(
	_request: Request
): Promise<NextResponse<ApiResponse<PeriodicityDto[]>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const periodicities = await listPeriodicities()

		return NextResponse.json({ data: periodicities })
	} catch (error) {
		console.error('Error al obtener periodicidades:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
