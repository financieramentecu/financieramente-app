import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { rezagarRegistros } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { rezagarRegistrosSchema } from '@/features/pre-liquidacion/lib/pre-liquidacion-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * POST /api/pre-liquidacion/rezagar
 * Transitions selected SYNCHRONIZED records to LAG with lagDate and isLag set.
 */
export async function POST(
	request: NextRequest
): Promise<NextResponse<ApiResponse<{ lagged: number }>>> {
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

		const userId = parseInt(String(session.user.id), 10)
		if (Number.isNaN(userId)) {
			return NextResponse.json(
				{ data: null, error: 'Sesión inválida' },
				{ status: 401 }
			)
		}

		const body = await request.json()
		const validation = rezagarRegistrosSchema.safeParse(body)
		if (!validation.success) {
			return NextResponse.json(
				{
					data: null,
					error: 'Datos inválidos',
					details: validation.error.issues.map((e) => ({
						path: e.path.join('.'),
						message: e.message,
					})),
				},
				{ status: 400 }
			)
		}

		const { ids } = validation.data
		const result = await rezagarRegistros(ids, userId)

		logAuditEvent({
			userId,
			action: AuditAction.COMMISSION_LAGGED,
			details: JSON.stringify({ ids }),
		}).catch(console.error)

		return NextResponse.json({ data: { lagged: result.lagged } })
	} catch (error) {
		console.error('Error al rezagar registros:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al rezagar registros',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
