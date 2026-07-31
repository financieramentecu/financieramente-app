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
 * PATCH /api/negocios/[id]/mark-novedad
 * Marca ("MARK") o desmarca ("UNMARK") la novedad de un negocio.
 * No hay allowlist de roles: cualquier usuario autenticado puede marcar/desmarcar.
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
							'Solo se puede marcar novedad en negocios en estado Venta Efectuada sin novedad pendiente',
					},
					{ status: 409 }
				)
			}
		} else {
			if (existingBusiness.novedadStatus !== BUSINESS_NOVEDAD_STATUS.PENDIENTE) {
				return NextResponse.json(
					{
						data: null,
						error: 'Solo se puede desmarcar una novedad en estado Pendiente',
					},
					{ status: 409 }
				)
			}
		}

		const updateData =
			action === 'MARK'
				? {
						novedadStatus: BUSINESS_NOVEDAD_STATUS.PENDIENTE,
						novedadMarkedAt: new Date(),
					}
				: {
						novedadStatus: null,
						novedadMarkedAt: null,
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
