import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

interface PpcOption {
	idProductPercentageCommission: number
	active: boolean
}

/**
 * GET /api/product-configurations/[id]/ppcs
 * Gets all PPCs belonging to a product configuration
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const configId = parseInt(id)

		const ppcs = await prisma.productPercentageCommission.findMany({
			where: { idProductConfiguration: configId },
			select: {
				idProductPercentageCommission: true,
				active: true,
			},
			orderBy: { idProductPercentageCommission: 'asc' },
		})

		const response: ApiResponse<PpcOption[]> = {
			data: ppcs,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching PPCs:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener comisiones de porcentaje',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
