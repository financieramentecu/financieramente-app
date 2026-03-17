import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { obtenerRegistrosParaLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaRegistrosLiquidacion } from '@/features/pre-liquidacion/types/types'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * GET /api/pre-liquidacion/registros/[fileId]
 * Returns SYNCHRONIZED records for the detail page (per-record Liquidar/Rezagar).
 */
export async function GET(
	_request: Request,
	props: { params: Promise<{ fileId: string }> }
): Promise<NextResponse<ApiResponse<RespuestaRegistrosLiquidacion>>> {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const role = session.user?.role as UserRole | undefined
		if (!role || !ALLOWED_ROLES.includes(role)) {
			return NextResponse.json(
				{ data: null, error: 'Sin permisos para este recurso' },
				{ status: 403 }
			)
		}

		const params = await props.params
		const fileId = parseInt(params.fileId, 10)
		if (Number.isNaN(fileId) || fileId <= 0) {
			return NextResponse.json(
				{ data: null, error: 'ID de archivo inválido' },
				{ status: 400 }
			)
		}

		const result = await obtenerRegistrosParaLiquidacion(fileId)
		if (!result) {
			return NextResponse.json(
				{ data: null, error: 'Archivo no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: result })
	} catch (error) {
		console.error('Error al obtener registros para liquidación:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al obtener registros',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
