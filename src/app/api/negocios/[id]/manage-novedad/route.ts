/**
 * API Route: /api/negocios/[id]/manage-novedad
 * PATCH - Gestión manual del estado de novedad de un negocio (backoffice)
 * Rol: ANALISTA_SOPORTE, ADMIN. HTTP-only: todo el acceso a Prisma vive en
 * business-novedad.service.ts.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'
import { manageNovedadSchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	getNovedadContext,
	updateNovedadStatus,
} from '@/features/negocios/services/business-novedad.service'
import { UserRole } from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

interface RouteParams {
	params: Promise<{ id: string }>
}

/**
 * Roles que pueden gestionar manualmente el estado de novedad
 */
const MANAGE_NOVEDAD_ALLOWED_ROLES = [UserRole.ADMIN, UserRole.ANALISTA_SOPORTE]

/**
 * PATCH /api/negocios/[id]/manage-novedad
 * Mueve la novedad de un negocio entre los 4 estados manuales
 * (SOMETIDA_DEVOLUCION, DECLINADA, PENDIENTE, CANCELADA). Sin estado terminal:
 * cualquier estado manual puede volver a cualquier otro. NUEVA nunca es un
 * destino válido — solo lo asigna el flujo automático de MARK.
 */
export async function PATCH(
	request: Request,
	{ params }: RouteParams
): Promise<NextResponse<ApiResponse<BusinessEntity>>> {
	try {
		const session = await auth()

		if (!session?.user?.email) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const userRole = currentUser.role?.code as UserRole
		if (!MANAGE_NOVEDAD_ALLOWED_ROLES.includes(userRole)) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para gestionar la novedad de este negocio' },
				{ status: 403 }
			)
		}

		const { id } = await params
		const businessId = parseInt(id, 10)

		if (isNaN(businessId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de negocio inválido' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const validationResult = manageNovedadSchema.safeParse(body)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.issues[0]?.message || 'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { novedadStatus: target } = validationResult.data

		const context = await getNovedadContext(businessId)

		if (!context || context.novedadStatus === null) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado o sin novedad marcada' },
				{ status: 404 }
			)
		}

		const from = context.novedadStatus
		const entity = await updateNovedadStatus(businessId, target)

		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: AuditAction.BUSINESS_NOVEDAD_STATUS_CHANGED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({ businessId, from, to: target }),
		})

		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al gestionar novedad de negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
