/**
 * API Route: /api/negocios/[id]/fondear
 * POST - Fondear un negocio sin anualidades (HU3)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	BUSINESS_STATUS,
	type BusinessEntity
} from '@/features/negocios/types/business-entity.types'
import {
	businessWithRelations
} from '@/features/negocios/types/business-prisma.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole, canFundPayments } from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { fondearBodySchema } from '@/features/negocios/lib/fondear.schema'
import {
	dateOnlyToBogotaNoonUtc,
	todayBogotaNoonUtc,
} from '@/features/negocios/lib/bogota-date'

interface RouteParams {
	params: Promise<{ id: string }>
}


/**
 * POST /api/negocios/[id]/fondear
 * Fondea un negocio en estado EMITIDO sin anualidades (HU3)
 * Transición atómica: EMITIDO → FONDEADO con dateAnchored = now()
 */
export async function POST(
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

		// Body es opcional: fondeo directo sin fecha usa la fecha actual (Bogotá)
		let bodyJson: unknown = {}
		try {
			const rawText = await request.text()
			bodyJson = rawText ? JSON.parse(rawText) : {}
		} catch {
			return NextResponse.json(
				{ data: null, error: 'Cuerpo JSON inválido' },
				{ status: 400 }
			)
		}

		const parsedBody = fondearBodySchema.safeParse(bodyJson)
		if (!parsedBody.success) {
			return NextResponse.json(
				{
					data: null,
					error:
						parsedBody.error.flatten().formErrors.join('; ') ||
						'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { fundedDate } = parsedBody.data

		let resolvedFundedDate: Date
		if (fundedDate) {
			const candidate = dateOnlyToBogotaNoonUtc(fundedDate)
			if (candidate > todayBogotaNoonUtc()) {
				return NextResponse.json(
					{
						data: null,
						error: 'La fecha de fondeo no puede ser futura',
					},
					{ status: 400 }
				)
			}
			resolvedFundedDate = candidate
		} else {
			resolvedFundedDate = new Date()
		}

		// Obtener usuario actual y verificar permisos
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Verificar que el usuario tiene permiso para fondear
		const userRole = currentUser.role?.code as UserRole
		if (!canFundPayments(userRole)) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para fondear negocios' },
				{ status: 403 }
			)
		}

		// Obtener el negocio con conteo de anualidades
		const existingBusiness = await prisma.business.findUnique({
			where: { idBusiness: businessId },
			include: {
				_count: {
					select: {
						payments: true,
					},
				},
			},
		})

		if (!existingBusiness) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		// Verificar que el negocio está en estado EMITIDO
		if (existingBusiness.status !== BUSINESS_STATUS.EMITIDO) {
			return NextResponse.json(
				{
					data: null,
					error: 'Solo se pueden fondear negocios en estado Emitido',
				},
				{ status: 400 }
			)
		}

		// Verificar que no tiene anualidades (flujo HU4)
		if (existingBusiness._count.payments > 0) {
			return NextResponse.json(
				{
					data: null,
					error: 'Este negocio tiene anualidades y debe fondearse mediante el flujo de anualidades',
				},
				{ status: 400 }
			)
		}

		// Fondear negocio: transición atómica EMITIDO → FONDEADO
		const fundedBusiness = await prisma.business.update({
			where: { idBusiness: businessId },
			data: {
				status: BUSINESS_STATUS.FONDEADO,
				dateAnchored: resolvedFundedDate,
			},
			include: businessWithRelations,
		})

		// Registrar en audit log
		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: AuditAction.BUSINESS_FUNDED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				contract: existingBusiness.contract,
				previousStatus: existingBusiness.status,
				fundedDate: fundedDate ?? null,
				dateAnchored: fundedBusiness.dateAnchored?.toISOString(),
			}),
		})

		const entity = prismaBusinessToEntity(fundedBusiness)

		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al fondear negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
