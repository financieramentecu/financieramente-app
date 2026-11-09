import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { fundDuePayments } from '@/features/negocios/services/payment-state.service'
import { todayBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import { verifyCronSecret } from '@/lib/auth/verify-cron-secret'

interface FundPaymentsSummary {
	fundedPayments: number
	fondeadoBusinesses: number
}

export async function POST(
	request: Request
): Promise<NextResponse<ApiResponse<FundPaymentsSummary>>> {
	const authHeader = request.headers.get('Authorization')

	if (!verifyCronSecret(authHeader)) {
		return NextResponse.json(
			{ data: null, error: 'Unauthorized' },
			{ status: 401 }
		)
	}

	try {
		const today = todayBogotaNoonUtc()
		const summary = await fundDuePayments(today)

		return NextResponse.json({ data: summary })
	} catch (error) {
		console.error('Error in fund-payments cron route:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
