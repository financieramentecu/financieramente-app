import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	findDiscountById,
	inactivateDiscount,
} from '@/features/commission-discounts/services/commission-discount.service'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user) {
		return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
	}

	const { id } = await params
	const discountId = parseInt(id, 10)

	const discount = await findDiscountById(discountId)

	if (!discount) {
		return NextResponse.json({ data: null, error: 'Descuento no encontrado' }, { status: 404 })
	}

	if (discount.status === 'INACTIVE') {
		return NextResponse.json(
			{ data: null, error: 'El descuento ya está inactivo' },
			{ status: 400 }
		)
	}

	const userId = parseInt(session.user.id as string, 10)
	const updated = await inactivateDiscount(discountId, userId)

	await logAuditEvent({
		userId,
		action: AuditAction.DISCOUNT_INACTIVATED,
		email: session.user.email ?? undefined,
		ipAddress: getClientIp(new Headers(request.headers)),
		userAgent: getUserAgent(new Headers(request.headers)),
		details: JSON.stringify({ discountId, previousStatus: 'ACTIVE' }),
	})

	return NextResponse.json({ data: updated })
}
