import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { registrarAprobacionDistribucion } from '@/features/mis-distribuciones/services/mis-distribuciones.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaAprobarDistribucion } from '@/features/mis-distribuciones/types/types'

/**
 * POST /api/mis-distribuciones/[fileId]/aprobar
 *
 * Registra la aprobación ("Estoy de acuerdo") del beneficiario autenticado
 * sobre su distribución para el archivo `fileId`. Es idempotente: si ya
 * existe una aprobación, responde 200 con la aprobación existente.
 *
 * Solo el propio beneficiario puede aprobar su distribución; no se acepta
 * aprobación en nombre ajeno (incluso para backoffice).
 */
export async function POST(
	_request: Request,
	props: { params: Promise<{ fileId: string }> }
): Promise<NextResponse<ApiResponse<RespuestaAprobarDistribucion>>> {
	try {
		const session = await auth()
		const sessionUserId = session?.user?.id
		if (!sessionUserId) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}
		const idUser = Number(sessionUserId)

		const params = await props.params
		const fileImportId = parseInt(params.fileId, 10)
		if (!Number.isFinite(fileImportId) || fileImportId <= 0) {
			return NextResponse.json(
				{ data: null, error: 'ID de archivo inválido' },
				{ status: 400 }
			)
		}

		const result = await registrarAprobacionDistribucion({
			fileImportId,
			idUser,
		})

		return NextResponse.json({
			data: {
				aprobado: result.aprobado,
				aprobadoAt: result.aprobadoAt.toISOString(),
			},
		})
	} catch (error) {
		console.error('Error al registrar aprobación:', error)
		const message =
			error instanceof Error ? error.message : 'Error al aprobar distribución'
		const status =
			error instanceof Error &&
			error.message.includes('No hay distribuciones')
				? 404
				: 500
		return NextResponse.json(
			{ data: null, error: message },
			{ status }
		)
	}
}
