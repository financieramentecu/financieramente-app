/**
 * API Route: /api/negocios/[id]/cancel
 * PATCH - Cancelar un negocio
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'
import {
	businessWithRelations,
	BUSINESS_STATUS,
} from '@/features/negocios/types/business-entity.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { cancelBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/lib/auth/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/lib/auth/audit-logger'

interface RouteParams {
	params: Promise<{ id: string }>
}

/**
 * Roles que pueden cancelar negocios
 */
const CANCEL_ALLOWED_ROLES = [
	UserRole.ADMIN,
	UserRole.ANALISTA_SOPORTE,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

/**
 * PATCH /api/negocios/[id]/cancel
 * Cancela un negocio con un motivo obligatorio
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

		const { id } = await params
		const businessId = parseInt(id, 10)

		if (isNaN(businessId)) {
			return NextResponse.json(
				{ data: null, error: 'ID de negocio inválido' },
				{ status: 400 }
			)
		}

		// Validar body
		const body = await request.json()
		const validationResult = cancelBusinessSchema.safeParse(body)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.issues[0]?.message || 'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { reason } = validationResult.data

		// Obtener usuario actual y verificar permisos
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Verificar que el usuario tiene permiso para cancelar
		const userRole = currentUser.role?.code as UserRole
		if (!CANCEL_ALLOWED_ROLES.includes(userRole)) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para cancelar negocios' },
				{ status: 403 }
			)
		}

		// Verificar que el negocio existe
		const existingBusiness = await prisma.business.findUnique({
			where: { idBusiness: businessId },
		})

		if (!existingBusiness) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		// Verificar que el negocio no está ya cancelado
		if (existingBusiness.status === BUSINESS_STATUS.CANCELADO) {
			return NextResponse.json(
				{ data: null, error: 'El negocio ya está cancelado' },
				{ status: 400 }
			)
		}

		// Verificar que el negocio está en estado cancelable
		const cancelableStatuses = [
			BUSINESS_STATUS.VENTA_EFECTUADA,
			BUSINESS_STATUS.EMITIDO,
		]
		if (
			!cancelableStatuses.includes(
				existingBusiness.status as typeof BUSINESS_STATUS.VENTA_EFECTUADA
			)
		) {
			return NextResponse.json(
				{
					data: null,
					error:
						'Solo se pueden cancelar negocios en estado Venta Efectuada o Emitido',
				},
				{ status: 400 }
			)
		}

		// Cancelar negocio
		const cancelledBusiness = await prisma.business.update({
			where: { idBusiness: businessId },
			data: {
				status: BUSINESS_STATUS.CANCELADO,
				observations: `[CANCELADO] ${reason}`,
			},
			include: businessWithRelations,
		})

		// Registrar en audit log
		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: AuditAction.BUSINESS_CANCELLED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				previousStatus: existingBusiness.status,
				reason,
			}),
		})

		const entity = prismaBusinessToEntity(cancelledBusiness)

		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al cancelar negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
