/**
 * API Route: /api/negocios/[id]/date-anchored
 * PATCH - Edita manualmente Business.dateAnchored (fecha de fondeo),
 * sincronizando Payment[installmentIndex=1] en la misma transacción.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'
import { canFundPayments } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { updateBusinessDateAnchored } from '@/features/negocios/services/business-date-anchored.service'
import { dateAnchoredBodySchema } from '@/features/negocios/lib/date-anchored.schema'
import {
	dateOnlyToBogotaNoonUtc,
	todayBogotaNoonUtc,
} from '@/features/negocios/lib/bogota-date'

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function PATCH(
	request: Request,
	{ params }: RouteParams
): Promise<NextResponse<ApiResponse<BusinessEntity>>> {
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

		if (!canFundPayments(currentUser.role?.code)) {
			return NextResponse.json(
				{ data: null, error: 'Permiso denegado' },
				{ status: 403 }
			)
		}

		const rawBody = await request.json().catch(() => null)
		const parsed = dateAnchoredBodySchema.safeParse(rawBody)

		if (!parsed.success) {
			return NextResponse.json(
				{ data: null, error: 'Datos inválidos', details: parsed.error.flatten() },
				{ status: 400 }
			)
		}

		const { id } = await params
		const businessId = parseInt(id, 10)

		if (isNaN(businessId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de negocio inválido' },
				{ status: 400 }
			)
		}

		const dateAnchored = dateOnlyToBogotaNoonUtc(parsed.data.dateAnchored)

		if (dateAnchored > todayBogotaNoonUtc()) {
			return NextResponse.json(
				{ data: null, error: 'La fecha de fondeo no puede ser futura' },
				{ status: 400 }
			)
		}

		const headers = new Headers(request.headers)

		const result = await updateBusinessDateAnchored(
			businessId,
			{
				userId: currentUser.idUser,
				email: currentUser.email,
				ip: getClientIp(headers) ?? '',
				ua: getUserAgent(headers) ?? '',
			},
			dateAnchored
		)

		if (!result.ok) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: result.business })
	} catch (error) {
		console.error('Error al actualizar la fecha de fondeo:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
