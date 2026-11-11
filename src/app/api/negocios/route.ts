/**
 * API Route: /api/negocios
 * GET - Listar negocios con paginación y filtros
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessListResponse } from '@/features/negocios/types/business-api.types'
import { businessListParamsSchema } from '@/features/negocios/lib/business-api.schemas'
import { parseBusinessListQuery } from '@/features/negocios/lib/parse-business-list-query'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { resolveVisibleUserIds } from '@/features/negocios/services/user-hierarchy.service'
import { listBusinesses } from '@/features/negocios/services/business-list.service'

/**
 * GET /api/negocios
 * Lista negocios con paginación y filtros
 *
 * Query params:
 * - page: number (default 1)
 * - pageSize: number (default 10, max 100)
 * - search: string (opcional) - Búsqueda unificada por identityNumber, nombres, apellidos,
 *   email del cliente, ID del negocio y número de contrato
 * - status: 'VENTA_EFECTUADA' | 'EMITIDO' | 'CANCELADO' (opcional)
 */
export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<BusinessListResponse>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const { searchParams } = new URL(request.url)
		const validationResult = businessListParamsSchema.safeParse(
			parseBusinessListQuery(searchParams)
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

		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Visibility scope:
		// ADMIN-like roles → no idUser filter (see all)
		// All other roles → hierarchical scope: [self, ...subordinates]
		const visibleUserIds = await resolveVisibleUserIds(prisma, currentUser)

		const data = await listBusinesses(
			prisma,
			currentUser,
			validationResult.data,
			visibleUserIds
		)

		return NextResponse.json({ data })
	} catch (error) {
		console.error('Error al listar negocios:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
