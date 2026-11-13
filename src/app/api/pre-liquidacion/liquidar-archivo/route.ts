import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { roleCan } from '@/features/access-control/services/role-permission-check'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { liquidarArchivoCompleto } from '@/features/pre-liquidacion/services/pre-liquidacion.service'

/**
 * POST /api/pre-liquidacion/liquidar-archivo
 * Liquida todos los registros pre-liquidados de un archivo
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const role = session.user?.role
		if (!(await roleCan(role, 'liquidacion.liquidar'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const body = await request.json()
		const { fileImportId } = body

		if (!fileImportId) {
			return NextResponse.json(
				{ error: 'Se requiere fileImportId' },
				{ status: 400 }
			)
		}

		const resultado = await liquidarArchivoCompleto(
			fileImportId,
			Number(session.user.id),
			{
				userId: Number(session.user.id),
				email: session.user.email ?? undefined,
				ipAddress: getClientIp(request.headers),
				userAgent: getUserAgent(request.headers),
			}
		)

		if (!resultado.success) {
			return NextResponse.json({ error: resultado.mensaje }, { status: 400 })
		}

		return NextResponse.json(resultado)
	} catch (error) {
		console.error('Error al liquidar archivo:', error)
		return NextResponse.json(
			{
				error: 'Error al liquidar archivo',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
