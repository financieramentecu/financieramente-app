import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
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
	// Inactivating the only active discount breaks settlement: ADMIN only.
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) return guard.response
	const { session } = guard

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
