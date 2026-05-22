import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { PaymentInstallmentDto } from '@/features/negocios/types/business-api.types'
import { canFundPayments } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { markPagoAnticipado } from '@/features/negocios/services/payment-state.service'

interface RouteParams {
	params: Promise<{ id: string; index: string }>
}

export async function POST(
	request: Request,
	{ params }: RouteParams
): Promise<NextResponse<ApiResponse<PaymentInstallmentDto>>> {
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

		const { id, index } = await params
		const businessId = parseInt(id, 10)
		const installmentIndex = parseInt(index, 10)

		if (isNaN(businessId) || isNaN(installmentIndex)) {
			return NextResponse.json(
				{ data: null, error: 'Parámetros inválidos' },
				{ status: 400 }
			)
		}

		const headers = new Headers(request.headers)
		const result = await markPagoAnticipado(businessId, installmentIndex, {
			userId: currentUser.idUser,
			email: currentUser.email,
			ip: getClientIp(headers) ?? '',
			ua: getUserAgent(headers) ?? '',
		})

		if (!result.ok) {
			if (result.code === 'NOT_FOUND') {
				return NextResponse.json(
					{ data: null, error: 'Aporte no encontrado' },
					{ status: 404 }
				)
			}
			return NextResponse.json(
				{ data: null, error: 'INVALID_TRANSITION' },
				{ status: 409 }
			)
		}

		return NextResponse.json({ data: result.payment })
	} catch (error) {
		console.error('Error al marcar pago anticipado:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
