/**
 * POST /api/negocios/[id]/fondear-aportes
 * Marca aportes (Payment) como fondeados; en la primera tanda EMITIDO → FONDEADO
 * calcula y persiste expectedDate para todos los aportes del negocio.
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
import { canFundPayments } from '@/features/auth/lib/roles'
import { calculateExpectedDates } from '@/features/negocios/lib/calculate-expected-dates'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { fondearAnualidadesBodySchema } from '@/features/negocios/lib/fondear-anualidades.schema'
import { dateOnlyToBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import { assertHasSupports } from '@/features/negocios/services/business-date-anchored.service'

interface RouteParams {
	params: Promise<{ id: string }>
}

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

		const { fundedInstallmentIndexes, fundedDate } = parsed.data

		const currentUser = await getCurrentUserByEmail(session.user.email)

		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const userRole = currentUser.role?.code
		if (!canFundPayments(userRole)) {
			return NextResponse.json(
				{ data: null, error: 'No tiene permisos para fondear negocios' },
				{ status: 403 }
			)
		}

		const existing = await prisma.business.findUnique({
			where: { idBusiness: businessId },
			include: {
				_count: { select: { payments: true } },
				buyPeriodicity: { select: { name: true } },
			},
		})

		if (!existing) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		if (existing._count.payments === 0) {
			return NextResponse.json(
				{
					data: null,
					error:
						'Este negocio no tiene aportes; use el fondeo directo',
				},
				{ status: 400 }
			)
		}

		const pendingCount = await prisma.payment.count({
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
						'El negocio no admite fondeo de aportes en su estado actual',
				},
				{ status: 400 }
			)
		}

		// Verificar que el negocio tiene soportes adjuntos antes de fondear
		const supportsCheck = await assertHasSupports(businessId)
		if (!supportsCheck.ok) {
			await logAuditEvent({
				userId: currentUser.idUser,
				roleId: currentUser.idRole ?? undefined,
				action: AuditAction.BUSINESS_PAYMENT_FUNDED,
				email: session.user.email,
				ipAddress: getClientIp(new Headers(request.headers)),
				userAgent: getUserAgent(new Headers(request.headers)),
				details: JSON.stringify({
					businessId,
					blocked: true,
					reason: 'NO_SUPPORTS',
				}),
			})
			return NextResponse.json(
				{ data: null, error: 'No se puede fondear sin soportes adjuntos' },
				{ status: 409 }
			)
		}

		const fundedBusiness = await prisma.$transaction(async (tx) => {
			const rowsToFund = await tx.payment.findMany({
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

			// Operator-supplied fundedDate (only valid for installment 1 manual funding).
			// When provided, it becomes the anchor for that row and for the business flip.
			// For all other installments, each row's expectedDate is used as anchor.
			const operatorAnchorDate: Date | undefined =
				fundedDate ? dateOnlyToBogotaNoonUtc(fundedDate) : undefined

			let businessAnchorDate: Date | null = null
			for (const row of rowsToFund) {
				const anchorDate =
					operatorAnchorDate ?? row.expectedDate ?? now
				if (!businessAnchorDate || anchorDate > businessAnchorDate) {
					businessAnchorDate = anchorDate
				}
				await tx.payment.update({
					where: { idAnnualPayment: row.idAnnualPayment },
					data: {
						status: AnnualPaymentStatus.FONDEADO,
						dateAnchored: anchorDate,
					},
				})
			}
			businessAnchorDate ??= now

			// On first fondeo (EMITIDO → FONDEADO): calculate and persist expectedDate for ALL payments
			if (parentWasEmitido) {
				const periodicityName = existing.buyPeriodicity?.name ?? null
				const numAportes = existing.numAportes ?? 0

				if (periodicityName && numAportes > 0) {
					const anchor = existing.dateIssued || existing.createdAt || now
					const expectedDates = calculateExpectedDates(anchor, numAportes, periodicityName)

					// Update all payment rows with their respective expectedDate
					const allPayments = await tx.payment.findMany({
						where: { idBusiness: businessId },
						orderBy: { installmentIndex: 'asc' },
						select: { idAnnualPayment: true, installmentIndex: true },
					})

					for (const payment of allPayments) {
						const dateIndex = payment.installmentIndex - 1
						const expectedDate = expectedDates[dateIndex]
						if (expectedDate != null) {
							await tx.payment.update({
								where: { idAnnualPayment: payment.idAnnualPayment },
								data: { expectedDate },
							})
						}
					}
				}

				await tx.business.updateMany({
					where: {
						idBusiness: businessId,
						status: BUSINESS_STATUS.EMITIDO,
					},
					data: {
						status: BUSINESS_STATUS.FONDEADO,
						dateAnchored: businessAnchorDate,
					},
				})
			} else {
				await tx.business.update({
					where: { idBusiness: businessId },
					data: { dateAnchored: businessAnchorDate },
				})
			}

			return tx.business.findUniqueOrThrow({
				where: { idBusiness: businessId },
				include: businessWithRelations,
			})
		}, { timeout: 15000 })

		const isManualFirstPayment =
			fundedDate !== undefined && fundedInstallmentIndexes.includes(1)

		await logAuditEvent({
			userId: currentUser.idUser,
			roleId: currentUser.idRole ?? undefined,
			action: isManualFirstPayment
				? AuditAction.APORTE_PRIMER_PAGO_FONDEADO
				: AuditAction.BUSINESS_PAYMENT_FUNDED,
			email: session.user.email,
			ipAddress: getClientIp(new Headers(request.headers)),
			userAgent: getUserAgent(new Headers(request.headers)),
			details: JSON.stringify({
				businessId,
				fundedInstallmentIndexes,
				fundedDate: fundedDate ?? null,
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
						'No hay aportes pendientes entre los índices seleccionados',
				},
				{ status: 400 }
			)
		}
		console.error('Error al fondear aportes:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}
