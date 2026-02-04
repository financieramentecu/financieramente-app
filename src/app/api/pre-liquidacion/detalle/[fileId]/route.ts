import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { obtenerDetallePreLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'

/**
 * GET /api/pre-liquidacion/detalle/[fileId]
 * Obtiene el detalle de registros sincronizados y rezagados para un archivo
 * con cálculos de distribución por posición. Toda la lógica está en el servicio.
 */
export async function GET(
	request: NextRequest,
	props: { params: Promise<{ fileId: string }> }
) {
	const params = await props.params
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const fileId = parseInt(params.fileId, 10)
		if (Number.isNaN(fileId)) {
			return NextResponse.json(
				{ error: 'ID de archivo inválido' },
				{ status: 400 }
			)
		}

		const detalle = await obtenerDetallePreLiquidacion(fileId)
		if (!detalle) {
			return NextResponse.json(
				{ error: 'Archivo no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json(detalle)
	} catch (error) {
		console.error('Error al obtener detalle:', error)
		return NextResponse.json(
			{
				error: 'Error al obtener detalle',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
