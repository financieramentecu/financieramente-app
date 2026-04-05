import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { Decimal } from '@prisma/client/runtime/library'

interface LagAutocompleteItem {
	id: number
	contract: string | null
	value: number
	description: string | null
}

export async function GET(
	request: NextRequest
): Promise<NextResponse<ApiResponse<LagAutocompleteItem[]>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const { searchParams } = new URL(request.url)
		const query = searchParams.get('q')

		if (!query || query.length < 3) {
			return NextResponse.json({ data: [], error: null })
		}

		const records = await prisma.settlementCommission.findMany({
			where: {
				status: 'LAG',
				contract: {
					startsWith: query,
					mode: 'insensitive',
				},
				idBusiness: null,
			},
			select: {
				idSettlementCommission: true,
				contract: true,
				commissionValue: true,
				baseCommission: true,
				descripcion: true,
			},
			take: 10,
		})

		const formatted = records.map((r) => ({
			id: r.idSettlementCommission,
			contract: r.contract,
			value: (r.commissionValue ?? r.baseCommission ?? new Decimal(0)).toNumber(),
			description: r.descripcion,
		}))

		return NextResponse.json({ data: formatted, error: null })
	} catch (error) {
		console.error('Error en autocomplete rezagos:', error)
		return NextResponse.json(
			{ data: null, error: 'Error del servidor' },
			{ status: 500 }
		)
	}
}
