import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { obtenerReciboDistribucion } from '@/features/mis-distribuciones/services/mis-distribuciones.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { RespuestaReciboDistribucion } from '@/features/mis-distribuciones/types/types'
import type { UserRole } from '@/features/auth/lib/roles'

/**
 * GET /api/mis-distribuciones/[fileId]
 *
 * Retorna el recibo detallado de distribución para el usuario autenticado
 * sobre el archivo `fileId`. Acepta opcionalmente `?userId=` para consultas
 * jerárquicas (líder viendo el recibo de un subordinado) o backoffice.
 *
 * 404 si el usuario no tiene distribuciones en el archivo o si el `fileId`
 * no existe. 403 si el viewer no tiene permiso sobre el `userId` solicitado.
 */
export async function GET(
	request: Request,
	props: { params: Promise<{ fileId: string }> }
): Promise<NextResponse<ApiResponse<RespuestaReciboDistribucion>>> {
	try {
		const session = await auth()
		const sessionUserId = session?.user?.id
		if (!sessionUserId) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}
		const viewerId = Number(sessionUserId)
		const viewerRole = session.user.role as UserRole | undefined

		const params = await props.params
		const fileImportId = parseInt(params.fileId, 10)
		if (!Number.isFinite(fileImportId) || fileImportId <= 0) {
			return NextResponse.json(
				{ data: null, error: 'ID de archivo inválido' },
				{ status: 400 }
			)
		}

		const url = new URL(request.url)
		const userIdParam = url.searchParams.get('userId')
		const beneficiaryIdRaw = userIdParam
			? parseInt(userIdParam, 10)
			: viewerId
		if (!Number.isFinite(beneficiaryIdRaw) || beneficiaryIdRaw <= 0) {
			return NextResponse.json(
				{ data: null, error: 'userId inválido' },
				{ status: 400 }
			)
		}

		const recibo = await obtenerReciboDistribucion({
			fileImportId,
			viewerId,
			viewerRole,
			beneficiaryId: beneficiaryIdRaw,
		})

		if (!recibo) {
			return NextResponse.json(
				{
					data: null,
					error:
						'Recibo no encontrado o sin permisos para visualizarlo',
				},
				{ status: 404 }
			)
		}

		return NextResponse.json({ data: { recibo } })
	} catch (error) {
		console.error('Error al obtener recibo de distribución:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al obtener recibo' },
			{ status: 500 }
		)
	}
}
