import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { obtenerArchivosDisponiblesPreliquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaArchivosDisponibles } from '@/features/pre-liquidacion/types/types'

/**
 * GET /api/pre-liquidacion/archivos
 * Lista archivos disponibles para pre-liquidar y pre-liquidados
 */
export async function GET(
	_request: NextRequest
): Promise<NextResponse<ApiResponse<RespuestaArchivosDisponibles>>> {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		// Obtenemos los archivos limpios delegando al servicio (sin llamar a prisma directo)
		const response = await obtenerArchivosDisponiblesPreliquidacion()

		return NextResponse.json({ data: response })
	} catch (error) {
		console.error('Error al obtener archivos disponibles:', error)
		return NextResponse.json(
			{
				data: null,
				error: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
