/**
 * API Route: /api/negocios/[id]/mark-novedad
 * PATCH - Marcar o desmarcar un negocio como "Con Novedad"
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	BUSINESS_STATUS,
	BUSINESS_NOVEDAD_STATUS,
	type BusinessEntity
} from '@/features/negocios/types/business-entity.types'
import {
	businessWithRelations
} from '@/features/negocios/types/business-prisma.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { markNovedadSchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
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
 * Roles que pueden desmarcar la novedad de cualquier negocio, sin importar
 * quién es el Money Strategist dueño (bypass de ownership en UNMARK).
 */
const UNMARK_OWNERSHIP_BYPASS_ROLES = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

/**
 * PATCH /api/negocios/[id]/mark-novedad
 * Marca ("MARK") o desmarca ("UNMARK") la novedad de un negocio.
 * MARK: cualquier usuario autenticado puede marcar. UNMARK: el Money Strategist
 * dueño del negocio, o ADMIN/ASISTENTE_GERENCIA_OPERATIVA sin restricción de ownership.
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
		const validationResult = markNovedadSchema.safeParse(body)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.issues[0]?.message || 'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { action } = validationResult.data

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
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

		// Verificar precondiciones según la acción
		if (action === 'MARK') {
			if (
				existingBusiness.status !== BUSINESS_STATUS.VENTA_EFECTUADA ||
				existingBusiness.novedadStatus !== null
			) {
				return NextResponse.json(
					{
						data: null,
						error:
							'Solo se puede marcar novedad en negocios en estado Venta Efectuada que aún no tengan una novedad marcada',
					},
					{ status: 409 }
				)
			}
		} else {
			if (existingBusiness.novedadStatus !== BUSINESS_NOVEDAD_STATUS.NUEVA) {
				return NextResponse.json(
					{
						data: null,
						error: 'Solo se puede desmarcar una novedad en estado Nueva',
					},
					{ status: 409 }
				)
			}

			const userRole = currentUser.role?.code as UserRole
			const canBypassOwnership = UNMARK_OWNERSHIP_BYPASS_ROLES.includes(userRole)

			if (!canBypassOwnership && existingBusiness.idUser !== currentUser.idUser) {
				return NextResponse.json(
					{
						data: null,
						error: 'Solo el Money Strategist dueño del negocio puede desmarcar su novedad',
					},
					{ status: 403 }
				)
			}
		}

		const updateData =
			action === 'MARK'
				? {
						novedadStatus: BUSINESS_NOVEDAD_STATUS.NUEVA,
						novedadMarkedAt: new Date(),
					}
				: {
						// Solo se limpia novedadStatus — novedadMarkedAt/novedadResolvedAt
						// se preservan como rastro forense (D7).
						novedadStatus: null,
					}

		const updatedBusiness = await prisma.business.update({
			where: { idBusiness: businessId },
			data: updateData,
			include: businessWithRelations,
		})

		// Registrar en audit log
		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action:
				action === 'MARK'
					? AuditAction.BUSINESS_NOVEDAD_MARKED
					: AuditAction.BUSINESS_NOVEDAD_UNMARKED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				previousNovedadStatus: existingBusiness.novedadStatus,
			}),
		})

		const entity = prismaBusinessToEntity(updatedBusiness)

		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al marcar/desmarcar novedad de negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
