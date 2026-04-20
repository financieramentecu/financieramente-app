import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { liquidarArchivoCompleto } from '@/features/pre-liquidacion/services/pre-liquidacion.service'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

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

		const role = session.user?.role as UserRole | undefined
		if (!role || !ALLOWED_ROLES.includes(role)) {
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
			Number(session.user.id)
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
