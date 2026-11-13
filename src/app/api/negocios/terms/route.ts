/**
 * GET /api/negocios/terms
 * Returns distinct term (loan duration in years) values from Business records.
 * Requires authentication.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { roleScope } from '@/features/access-control/services/role-permission-check'
import { listDistinctTerms } from '@/features/negocios/services/business-terms.service'

export async function GET(
	_request: Request
): Promise<NextResponse<ApiResponse<number[]>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		// PARTNER only sees terms of their own businesses (NEG-03)
		const partnerId = Number.parseInt(session.user.id ?? '', 10)
		const terms =
			(await roleScope(session.user.role, 'negocios.ver')) === 'OWN' &&
			Number.isFinite(partnerId)
				? await listDistinctTerms({ ownerIds: [partnerId] })
				: await listDistinctTerms()

		return NextResponse.json({ data: terms })
	} catch (error) {
		console.error('Error al obtener plazos:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
