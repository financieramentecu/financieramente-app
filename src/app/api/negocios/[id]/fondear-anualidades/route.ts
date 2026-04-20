/**
 * POST /api/negocios/[id]/fondear-anualidades
 * Marca cuotas AnnualPayment como fondeadas (HU4); primera tanda desde EMITIDO → FONDEADO en padre.
 */

import { NextResponse } from 'next/server'
import { AnnualPaymentStatus } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	BUSINESS_STATUS,
	type BusinessEntity,
} from '@/features/negocios/types/business-entity.types'
import { businessWithRelations } from '@/features/negocios/types/business-prisma.types'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import {
	fondearAnualidadesBodySchema,
} from '@/features/negocios/lib/fondear-anualidades.schema'

interface RouteParams {
	params: Promise<{ id: string }>
}

const FONDEAR_ALLOWED_ROLES = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.AGENTE,
]

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

		let bodyJson: unknown
		try {
			bodyJson = await request.json()
		} catch {
			return NextResponse.json(
				{ data: null, error: 'Cuerpo JSON inválido' },
				{ status: 400 }
			)
		}

		const parsed = fondearAnualidadesBodySchema.safeParse(bodyJson)
		if (!parsed.success) {
			return NextResponse.json(
				{
					data: null,
					error:
						parsed.error.flatten().formErrors.join('; ') ||
						'Datos inválidos',
				},
				{ status: 400 }
			)
		}

		const { fundedInstallmentIndexes } = parsed.data

		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const userRole = currentUser.role?.code as UserRole
		if (!FONDEAR_ALLOWED_ROLES.includes(userRole)) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para fondear negocios' },
				{ status: 403 }
			)
		}

		const existing = await prisma.business.findUnique({
			where: { idBusiness: businessId },
			include: {
				_count: { select: { annualPayments: true } },
			},
		})

		if (!existing) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		if (userRole === UserRole.AGENTE && existing.idUser !== currentUser.idUser) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para fondear este negocio' },
				{ status: 403 }
			)
		}

		if (existing._count.annualPayments === 0) {
			return NextResponse.json(
				{
					data: null,
					error:
						'Este negocio no tiene anualidades; use el fondeo directo',
				},
				{ status: 400 }
			)
		}

		const pendingCount = await prisma.annualPayment.count({
			where: {
				idBusiness: businessId,
				status: AnnualPaymentStatus.SIN_FONDEAR,
			},
		})

		const status = existing.status
		const allowedParent =
			status === BUSINESS_STATUS.EMITIDO ||
			(status === BUSINESS_STATUS.FONDEADO && pendingCount > 0)

		if (!allowedParent) {
			return NextResponse.json(
				{
					data: null,
					error:
						'El negocio no admite fondeo de anualidades en su estado actual',
				},
				{ status: 400 }
			)
		}

		const fundedBusiness = await prisma.$transaction(async (tx) => {
			const rowsToFund = await tx.annualPayment.findMany({
				where: {
					idBusiness: businessId,
					installmentIndex: { in: fundedInstallmentIndexes },
					status: AnnualPaymentStatus.SIN_FONDEAR,
				},
			})

			if (rowsToFund.length === 0) {
				throw new Error('NO_PENDING_INSTALLMENTS')
			}

			const now = new Date()
			const parentWasEmitido = status === BUSINESS_STATUS.EMITIDO

			for (const row of rowsToFund) {
				await tx.annualPayment.update({
					where: { idAnnualPayment: row.idAnnualPayment },
					data: {
						status: AnnualPaymentStatus.FONDEADO,
						dateAnchored: now,
					},
				})
			}

			if (parentWasEmitido) {
				await tx.business.updateMany({
					where: {
						idBusiness: businessId,
						status: BUSINESS_STATUS.EMITIDO,
					},
					data: {
						status: BUSINESS_STATUS.FONDEADO,
						dateAnchored: now,
					},
				})
			}

			return tx.business.findUniqueOrThrow({
				where: { idBusiness: businessId },
				include: businessWithRelations,
			})
		})

		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: AuditAction.BUSINESS_ANNUAL_FUNDED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				fundedInstallmentIndexes,
				previousStatus: status,
			}),
		})

		const entity = prismaBusinessToEntity(fundedBusiness)

		return NextResponse.json({ data: entity })
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === 'NO_PENDING_INSTALLMENTS'
		) {
			return NextResponse.json(
				{
					data: null,
					error:
						'No hay cuotas pendientes entre los índices seleccionados',
				},
				{ status: 400 }
			)
		}
		console.error('Error al fondear anualidades:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
