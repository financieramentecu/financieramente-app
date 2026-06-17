import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { fundDuePayments } from '@/features/negocios/services/payment-state.service'
import { todayBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'

interface FundPaymentsSummary {
	fundedPayments: number
	fondeadoBusinesses: number
}

function verifyCronSecret(authorizationHeader: string | null): boolean {
	const expected = process.env.CRON_SECRET
	if (!expected || !authorizationHeader) return false

	const prefix = 'Bearer '
	if (!authorizationHeader.startsWith(prefix)) return false

	const incoming = authorizationHeader.slice(prefix.length)

	// Length pre-check: crypto.timingSafeEqual throws on length mismatch,
	// so we guard with an early return first.
	if (incoming.length !== expected.length) return false

	const incomingBuf = Buffer.from(incoming)
	const expectedBuf = Buffer.from(expected)

	return timingSafeEqual(incomingBuf, expectedBuf)
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
