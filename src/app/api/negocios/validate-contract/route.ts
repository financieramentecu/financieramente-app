/**
 * API Route: /api/negocios/validate-contract
 * GET - Validar si un número de contrato está disponible
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ContractValidationResponse } from '@/features/negocios/types/business-api.types'

/**
 * GET /api/negocios/validate-contract
 * Valida si un número de contrato está disponible
 *
 * Query params:
 * - contract: string (obligatorio) - Número de contrato a validar
 * - excludeBusinessId: number (opcional) - ID del negocio a excluir (para edición)
 */
export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<ContractValidationResponse>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const { searchParams } = new URL(request.url)
		const contract = searchParams.get('contract')
		const excludeBusinessId = searchParams.get('excludeBusinessId')

		if (!contract) {
			return NextResponse.json(
				{ data: null, error: 'El número de contrato es obligatorio' },
				{ status: 400 }
			)
		}

		// Buscar si existe un negocio con ese contrato
		const existingBusiness = await prisma.business.findFirst({
			where: {
				contract,
				...(excludeBusinessId
					? { NOT: { idBusiness: parseInt(excludeBusinessId, 10) } }
					: {}),
			},
			select: {
				idBusiness: true,
			},
		})

		if (existingBusiness) {
			return NextResponse.json({
				data: {
					available: false,
					existingBusinessId: existingBusiness.idBusiness,
				},
			})
		}

		return NextResponse.json({
			data: {
				available: true,
			},
		})
	} catch (error) {
		console.error('Error al validar contrato:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
