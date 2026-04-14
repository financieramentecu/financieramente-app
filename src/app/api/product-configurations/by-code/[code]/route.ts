import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProductConfiguration } from '@/features/product-configuration/types/product-configuration.types'
import { getProductConfigurationByCode } from '@/features/product-configuration/services/product-configuration.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/product-configurations/by-code/[code]
 * Resolves a single product configuration by its unique code (RF-06 / RF-07).
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ code: string }> }
) {
	try {
		const { code } = await params

		const config = await getProductConfigurationByCode(code)

		if (!config) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Configuración de producto no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const response: ApiResponse<ProductConfiguration> = {
			data: config,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching product configuration by code:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener configuración de producto',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
