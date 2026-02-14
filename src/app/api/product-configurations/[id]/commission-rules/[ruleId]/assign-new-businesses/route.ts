import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export const dynamic = 'force-dynamic'

interface RouteParams {
	params: Promise<{
		id: string
		ruleId: string
	}>
}

interface AssignNewBusinessesResponse {
	idProductConfiguration: number
	idProductPercentageCommissionNewBusinesses: number | null
}

/**
 * POST /api/product-configurations/[id]/commission-rules/[ruleId]/assign-new-businesses
 * Assign a commission rule as default for new businesses
 */
export async function POST(
	_request: Request,
	props: RouteParams
): Promise<NextResponse<ApiResponse<AssignNewBusinessesResponse>>> {
	const params = await props.params

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
					error:
						'Solo se puede asignar una regla activa como predeterminada',
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
			error: null,
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
