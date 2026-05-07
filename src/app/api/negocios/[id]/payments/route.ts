/**
 * GET /api/negocios/[id]/payments
 * Lista aportes del negocio para el modal de fondeo (ordenados por installmentIndex)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AnnualPaymentsResponse } from '@/features/negocios/types/business-api.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import type { BusinessStatus } from '@/features/negocios/types/business-entity.types'

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(
	_request: Request,
	{ params }: RouteParams
): Promise<NextResponse<ApiResponse<AnnualPaymentsResponse>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
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

		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const isAgent = currentUser.role?.code === UserRole.AGENTE
		const whereClause = isAgent
			? { idBusiness: businessId, idUser: currentUser.idUser }
			: { idBusiness: businessId }

		const business = await prisma.business.findFirst({
			where: whereClause,
			include: {
				payments: {
					orderBy: { installmentIndex: 'asc' },
				},
				buyPeriodicity: {
					select: { name: true },
				},
			},
		})

		if (!business) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		const installments = business.payments.map((p) => ({
			installmentIndex: p.installmentIndex,
			status: p.status as 'SIN_FONDEAR' | 'FONDEADO',
			dateAnchored: p.dateAnchored?.toISOString() ?? null,
			expectedDate: p.expectedDate?.toISOString() ?? null,
		}))

		const payload: AnnualPaymentsResponse = {
			businessId,
			status: business.status as BusinessStatus,
			installments,
		}

		return NextResponse.json({ data: payload })
	} catch (error) {
		console.error('Error al obtener aportes:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
