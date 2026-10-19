import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'

export const dynamic = 'force-dynamic'

interface RouteParams {
	params: Promise<{
		id: string
		ruleId: string
	}>
}

/**
 * POST /api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses
 * Assign a commission rule as default for new businesses
 */
export async function POST(
	_request: Request,
	props: RouteParams
): Promise<NextResponse> {
	const params = await props.params
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}

	try {
		const productConfigId = Number(params.id)
		const ruleId = Number(params.ruleId)

		if (Number.isNaN(productConfigId) || Number.isNaN(ruleId)) {
			return NextResponse.json(
				{ data: null, error: 'IDs inválidos' },
				{ status: 400 }
			)
		}

		const rule = await prisma.productPercentageCommission.findUnique({
			where: { idProductPercentageCommission: ruleId },
			select: {
				idProductConfiguration: true,
				active: true,
			},
		})

		if (!rule || rule.idProductConfiguration !== productConfigId) {
			return NextResponse.json(
				{ data: null, error: 'La regla no pertenece a esta configuración' },
				{ status: 404 }
			)
		}

		if (!rule.active) {
			return NextResponse.json(
				{
					data: null,
					error: 'Solo se puede asignar una regla activa como predeterminada',
				},
				{ status: 400 }
			)
		}

		const updatedConfig = await prisma.productConfiguration.update({
			where: { id: productConfigId },
			data: { idProductPercentageCommissionNewBusinesses: ruleId },
			select: {
				id: true,
				idProductPercentageCommissionNewBusinesses: true,
			},
		})

		return NextResponse.json({
			data: {
				idProductConfiguration: updatedConfig.id,
				idProductPercentageCommissionNewBusinesses:
					updatedConfig.idProductPercentageCommissionNewBusinesses,
			},
		})
	} catch (error) {
		console.error(
			'Error assigning default commission rule for new businesses:',
			error
		)
		return NextResponse.json(
			{
				data: null,
				error: 'Error interno al asignar la regla predeterminada',
			},
			{ status: 500 }
		)
	}
}
