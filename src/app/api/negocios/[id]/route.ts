/**
 * API Route: /api/negocios/[id]
 * GET - Obtener detalle de un negocio
 * PUT - Actualizar un negocio (principalmente el contrato)
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
import { updateBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
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
 * GET /api/negocios/[id]
 * Obtiene el detalle de un negocio por ID
 */
export async function GET(
	_request: Request,
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

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Construir query según rol
		const isAgent = currentUser.role?.code === UserRole.AGENTE
		const whereClause = isAgent
			? { idBusiness: businessId, idUser: currentUser.idUser }
			: { idBusiness: businessId }

		const business = await prisma.business.findFirst({
			where: whereClause,
			include: businessWithRelations,
		})

		if (!business) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		const entity = prismaBusinessToEntity(business)

		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al obtener negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}

/**
 * PUT /api/negocios/[id]
 * Actualiza un negocio (principalmente el número de contrato)
 * Cambia el estado de VENTA_EFECTUADA a EMITIDO al agregar contrato
 */
export async function PUT(
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
		const validationResult = updateBusinessSchema.safeParse(body)

		if (!validationResult.success) {
			return NextResponse.json(
				{
					data: null,
					error: validationResult.error.issues[0]?.message || 'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { contract, idClientOrigin } = validationResult.data

		if (contract === undefined && idClientOrigin === undefined) {
			return NextResponse.json(
				{ data: null, error: 'Debe enviar contract o idClientOrigin' },
				{ status: 400 }
			)
		}

		// Obtener usuario actual
		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		// Verificar que el negocio existe y el usuario tiene acceso
		const isAgent = currentUser.role?.code === UserRole.AGENTE
		const whereClause = isAgent
			? { idBusiness: businessId, idUser: currentUser.idUser }
			: { idBusiness: businessId }

		const existingBusiness = await prisma.business.findFirst({
			where: whereClause,
		})

		if (!existingBusiness) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		// Flujo: solo idClientOrigin (negocio EMITIDO) o solo contract (negocio VENTA_EFECTUADA)
		if (idClientOrigin !== undefined && contract === undefined) {
			if (existingBusiness.status !== BUSINESS_STATUS.EMITIDO) {
				return NextResponse.json(
					{
						data: null,
						error: 'Solo se puede cambiar el origen en negocios en estado Emitido',
					},
					{ status: 400 }
				)
			}

			const originExists = await prisma.clientOrigin.findFirst({
				where: { idClientOrigin, status: true },
			})
			if (!originExists) {
				return NextResponse.json(
					{ data: null, error: 'Origen de cliente no válido o inactivo' },
					{ status: 400 }
				)
			}

			const updatedBusiness = await prisma.business.update({
				where: { idBusiness: businessId },
				data: { idClientOrigin },
				include: businessWithRelations,
			})

			await logAuditEvent({
				userId: currentUser.idUser,
				roleId: currentUser.idRole ?? undefined,
				action: AuditAction.BUSINESS_UPDATED,
				email: session.user.email,
				ipAddress: getClientIp(new Headers(request.headers)),
				userAgent: getUserAgent(new Headers(request.headers)),
				details: JSON.stringify({
					businessId,
					idClientOrigin,
				}),
			})

			const entity = prismaBusinessToEntity(updatedBusiness)
			return NextResponse.json({ data: entity })
		}

		// Flujo: actualizar contrato (solo cuando VENTA_EFECTUADA)
		if (existingBusiness.status !== BUSINESS_STATUS.VENTA_EFECTUADA) {
			return NextResponse.json(
				{
					data: null,
					error: 'Solo se pueden editar negocios en estado Venta Efectuada',
				},
				{ status: 400 }
			)
		}

		// Verificar que el contrato no esté duplicado
		if (contract) {
			const duplicateContract = await prisma.business.findFirst({
				where: {
					contract,
					NOT: { idBusiness: businessId },
				},
			})

			if (duplicateContract) {
				return NextResponse.json(
					{
						data: null,
						error: `El número de contrato '${contract}' ya está asignado al negocio #${duplicateContract.idBusiness}. Por favor, ingrese uno diferente.`,
					},
					{ status: 409 }
				)
			}
		}

		// Actualizar negocio: contrato y estado a EMITIDO
		const newStatus = contract
			? BUSINESS_STATUS.EMITIDO
			: existingBusiness.status

		const updatedBusiness = await prisma.business.update({
			where: { idBusiness: businessId },
			data: {
				contract: contract || null,
				status: newStatus,
			},
			include: businessWithRelations,
		})

		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: AuditAction.BUSINESS_UPDATED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				previousStatus: existingBusiness.status,
				newStatus,
				contract,
			}),
		})

		const entity = prismaBusinessToEntity(updatedBusiness)
		return NextResponse.json({ data: entity })
	} catch (error) {
		console.error('Error al actualizar negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
