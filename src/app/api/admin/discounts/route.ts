import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createCommissionDiscountSchema } from '@/features/commission-discounts/lib/commission-discount-schemas'
import {
	listDiscounts,
	findActiveByType,
	createDiscount,
} from '@/features/commission-discounts/services/commission-discount.service'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CommissionDiscount } from '@/features/commission-discounts/types/commission-discount.types'
import { z } from 'zod'

export async function GET(
	_request: Request
): Promise<NextResponse<ApiResponse<CommissionDiscount[]>>> {
	const session = await auth()
	if (!session?.user) {
		return NextResponse.json(
			{ data: null, error: 'Unauthorized' },
			{ status: 401 }
		)
	}

	try {
		const rows = await listDiscounts()
		const data: CommissionDiscount[] = rows.map((row) => ({
			id: row.id,
			name: row.name,
			type: row.type as CommissionDiscount['type'],
			percentage: Number(row.percentage),
			description: row.description,
			status: row.status as CommissionDiscount['status'],
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			createdById: row.createdById,
			updatedById: row.updatedById,
			createdBy: row.createdBy ? { name: row.createdBy.name } : null,
			updatedBy: row.updatedBy ? { name: row.updatedBy.name } : null,
		}))
		return NextResponse.json({ data })
	} catch {
		return NextResponse.json(
			{ data: null, error: 'Error al obtener descuentos' },
			{ status: 500 }
		)
	}
}

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user) {
		return NextResponse.json(
			{ data: null, error: 'Unauthorized' },
			{ status: 401 }
		)
	}

	try {
		const body = await request.json()
		const input = createCommissionDiscountSchema.parse(body)

		const existing = await findActiveByType(input.type)
		if (existing) {
			return NextResponse.json(
				{
					data: null,
					error: `Ya existe un descuento activo de tipo ${input.type}`,
				},
				{ status: 409 }
			)
		}

		const userId = parseInt(session.user.id as string, 10)
		const discount = await createDiscount(input, userId)

		await logAuditEvent({
			userId,
			action: AuditAction.DISCOUNT_CREATED,
			email: session.user.email ?? undefined,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				discountId: discount.id,
				name: discount.name,
				type: discount.type,
				percentage: Number(discount.percentage),
			}),
		})

		return NextResponse.json({ data: discount }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message ?? 'Datos inválidos' },
				{ status: 400 }
			)
		}
		return NextResponse.json(
			{ data: null, error: 'Error al crear descuento' },
			{ status: 500 }
		)
	}
}
