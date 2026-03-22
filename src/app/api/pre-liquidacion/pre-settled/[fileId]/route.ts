import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { obtenerComisionesPreliquidadas } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaRegistrosLiquidacion } from '@/features/pre-liquidacion/types/types'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * GET /api/pre-liquidacion/pre-settled/[fileId]
 * Returns PRE-SETTLED commission records for the given file import.
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

		const result = await obtenerComisionesPreliquidadas(fileId)
		if (!result) {
			return NextResponse.json(
				{ data: null, error: 'Archivo no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: result })
	} catch (error) {
		console.error('Error al obtener comisiones pre-liquidadas:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al obtener comisiones pre-liquidadas',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
