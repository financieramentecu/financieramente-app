import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { AuditAction, logAuditEvent } from '@/features/auth/lib/audit-logger'
import { liquidarRegistros } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { liquidarRegistrosSchema } from '@/features/pre-liquidacion/lib/pre-liquidacion-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

/**
 * POST /api/pre-liquidacion/liquidar
 * Transitions selected SYNCHRONIZED records to SETTLED; sets FileImport COMPLETED when 0 remain.
 */
export async function POST(
	request: NextRequest
): Promise<
	NextResponse<
		ApiResponse<{ liquidated: number; fileCompleted: boolean }>
	>
> {
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
		const validation = liquidarRegistrosSchema.safeParse(body)
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

		const { ids, fileId } = validation.data
		const result = await liquidarRegistros(ids, userId, fileId)

		logAuditEvent({
			userId,
			action: AuditAction.COMMISSION_SETTLED,
			details: JSON.stringify({ ids, fileId }),
		}).catch(console.error)

		return NextResponse.json({
			data: {
				liquidated: result.liquidated,
				fileCompleted: result.fileCompleted,
			},
		})
	} catch (error) {
		console.error('Error al liquidar registros:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al liquidar registros',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
