/**
 * API Route: /api/negocios/[id]
 * GET - Obtener detalle de un negocio
 * PUT - Actualizar un negocio (principalmente el contrato)
 */

import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
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
import { updateBusinessSchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { recalcularComisionesPorCambioOrigen } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { validateProductConfigurationExists } from '@/features/negocios/services/product-configuration.service'
import { PARTNER_PRODUCT_UNAVAILABLE_ERROR } from '@/features/negocios/services/business-creation.service'
import { resolveDistributionLevel } from '@/features/negocios/lib/distribution-level'
import {
	checkBusinessRoleGate,
	resolveBusinessScope,
} from '@/features/negocios/services/business-access.service'
import { businessAccessDeniedResponse } from '@/features/negocios/lib/business-access-http'

import {
	UserRole,
	canEditContractWhenBusinessEmitido,
} from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { findProductPercentageCommission } from '@/features/negocios/actions/find-product-percentage-commission'
import { calculateNumAportes } from '@/features/negocios/lib/calculate-num-aportes'
import { mfundPeriodicityError } from '@/features/negocios/lib/mfund-periodicity'
import { calculateExpectedDates } from '@/features/negocios/lib/calculate-expected-dates'
import { AnnualPaymentStatus } from '@prisma/client'
import { sincronizarYCalcularRegistroRezagado } from '@/features/pre-liquidacion/services/pre-liquidacion.service'

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

		// SEC-03: central access decision (global roles all, AGENTE self+subordinates,
		// PARTNER own, unknown roles fail closed).
		const denied = checkBusinessRoleGate(currentUser, 'read')
		if (denied) {
			return businessAccessDeniedResponse(denied.reason)
		}
		const scope = await resolveBusinessScope(prisma, currentUser)

		const business = await prisma.business.findFirst({
			where: { idBusiness: businessId, ...scope },
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

		const {
			contract,
			idClientOrigin,
			idSettlementCommission,
			idProduct,
			term,
			value,
			idBuyPeriodicity,
			idCurrency,
			idUser,
			numAportes,
			dateIssued,
		} = validationResult.data
		
		if (Object.keys(validationResult.data).length === 0) {
			return NextResponse.json(
				{ data: null, error: 'Debe enviar al menos un campo para actualizar' },
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

		// SEC-03: read-only and unknown roles are refused before any lookup
		const denied = checkBusinessRoleGate(currentUser, 'write')
		if (denied) {
			return businessAccessDeniedResponse(denied.reason)
		}

		// Verificar que el negocio existe y el usuario tiene acceso
		const isAdmin = currentUser.role?.code === UserRole.ADMIN
		const isAsistente = currentUser.role?.code === UserRole.ASISTENTE_GERENCIA_OPERATIVA
		const isAnalista = currentUser.role?.code === UserRole.ANALISTA_SOPORTE
		const isPrivileged = isAdmin || isAsistente || isAnalista

		// Edits stay owner-only for AGENTE (existing rule); PARTNER is own-only by scope.
		const writeScope = await resolveBusinessScope(prisma, currentUser, {
			ownOnly: true,
		})

		const existingBusiness = await prisma.business.findFirst({
			where: { idBusiness: businessId, ...writeScope },
			include: {
				productPercentageCommission: {
					include: {
						productConfiguration: {
							include: {
								product: {
									include: {
										company: true,
									},
								},
								level: { select: { code: true } },
							},
						},
					},
				},
				buyPeriodicity: true,
				user: true,
				_count: {
					select: { payments: true },
				},
			},
		})

		if (!existingBusiness) {
			return NextResponse.json(
				{ data: null, error: 'Negocio no encontrado' },
				{ status: 404 }
			)
		}

		// Validar que el negocio esté en un estado editable
		if (
			existingBusiness.status !== BUSINESS_STATUS.VENTA_EFECTUADA &&
			existingBusiness.status !== BUSINESS_STATUS.EMITIDO &&
			existingBusiness.status !== BUSINESS_STATUS.FONDEADO
		) {
			return NextResponse.json(
				{ data: null, error: 'Solo se pueden editar negocios en estado VENTA_EFECTUADA, EMITIDO o FONDEADO' },
				{ status: 400 }
			)
		}

		// Validar permisos para campos sensibles si no es borrador
		const isNotDraft = existingBusiness.status !== BUSINESS_STATUS.VENTA_EFECTUADA
		const sensitiveFields = [idProduct, term, value, idBuyPeriodicity, idCurrency, idUser, numAportes, dateIssued]
		const isUpdatingSensitive = sensitiveFields.some((f) => f !== undefined)

		if (isNotDraft && isUpdatingSensitive && !isPrivileged) {
			return NextResponse.json(
				{
					data: null,
					error: 'No tienes permisos para editar campos clave de un negocio ya emitido',
				},
				{ status: 403 }
			)
		}

		// A PARTNER can never hand their business over to another owner
		if (idUser !== undefined && currentUser.role?.code === UserRole.PARTNER) {
			return NextResponse.json(
				{ data: null, error: 'No tienes permisos para reasignar el negocio' },
				{ status: 403 }
			)
		}

		// Validar permisos para contrato si ya está emitido
		if (
			isNotDraft &&
			contract !== undefined &&
			!canEditContractWhenBusinessEmitido(currentUser.role?.code)
		) {
			return NextResponse.json(
				{ data: null, error: 'No tienes permisos para editar el contrato de un negocio ya emitido' },
				{ status: 403 }
			)
		}

		const existingProductId =
			existingBusiness.productPercentageCommission?.productConfiguration?.idProduct
		const changesFundedStructure =
			existingBusiness.status === BUSINESS_STATUS.FONDEADO &&
			((term !== undefined && term !== existingBusiness.term) ||
				(idBuyPeriodicity !== undefined &&
					idBuyPeriodicity !== existingBusiness.idBuyPeriodicity) ||
				(idProduct !== undefined && idProduct !== existingProductId) ||
				(numAportes !== undefined && numAportes !== (existingBusiness.numAportes ?? 0)))

		// --- RESOLUCIÓN DE DATOS PARA ACTUALIZACIÓN ---
		let finalIdPpc = existingBusiness.idProductPercentageCommission
		let finalNumAportes = existingBusiness.numAportes ?? 0
		let shouldSyncPayments = false
		let resolvedPeriodicityName: string | null = existingBusiness.buyPeriodicity?.name ?? null
		// PARTNER_EXTERNAL businesses have no distribution lines: their PPC is empty by
		// design, so the category-line validation and commission recalculation are skipped.
		// Resolved once per level: the current level, then the final one if the owner changes.
		const currentLevel = resolveDistributionLevel(
			existingBusiness.productPercentageCommission?.productConfiguration?.level?.code
		)
		let finalLevel = currentLevel
		const isPartnerBusiness = currentLevel.isDistributionExcluded

		// --- FLUJO ESPECIAL: CAMBIO DE ORIGEN ---
		if (idClientOrigin !== undefined && isUpdatingSensitive === false && contract === undefined) {
			if (existingBusiness.status !== BUSINESS_STATUS.EMITIDO) {
				return NextResponse.json(
					{ data: null, error: 'Solo se puede cambiar el origen en negocios con estado EMITIDO.' },
					{ status: 400 }
				)
			}

			const validation = isPartnerBusiness
				? { valid: true as const }
				: await validateProductConfigurationExists(
						existingBusiness.productPercentageCommission.productConfiguration.idLevel,
						idProduct ?? existingBusiness.productPercentageCommission.productConfiguration.idProduct
					)

			if (!validation.valid) {
				return NextResponse.json(
					{ data: null, error: validation.reason || 'No existe configuración para este origen' },
					{ status: 400 }
				)
			}
		}

		// 1. Resolver PPC si cambia producto o agente
		if (idProduct !== undefined || idUser !== undefined) {
			const targetIdProduct = idProduct ?? existingBusiness.productPercentageCommission.productConfiguration.idProduct
			const targetIdUser = (!isNotDraft && idUser !== undefined) ? idUser : existingBusiness.idUser

			let targetIdLevel = existingBusiness.productPercentageCommission.productConfiguration.idLevel

			if (idUser !== undefined && !isNotDraft) {
				const newUser = await prisma.user.findUnique({
					where: { idUser: targetIdUser },
					select: { idLevel: true, level: { select: { code: true } } },
				})
				if (!newUser?.idLevel) {
					return NextResponse.json(
						{ data: null, error: 'El agente seleccionado no tiene un nivel válido' },
						{ status: 400 }
					)
				}
				targetIdLevel = newUser.idLevel
				finalLevel = resolveDistributionLevel(newUser.level?.code)
			}

			const ppcResult = await findProductPercentageCommission({
				idProduct: targetIdProduct,
				idLevel: targetIdLevel,
			})

			if ('error' in ppcResult || !ppcResult.data) {
				return NextResponse.json(
					{
						data: null,
						error: finalLevel.isDistributionExcluded
							? PARTNER_PRODUCT_UNAVAILABLE_ERROR
							: 'No existe configuración de comisiones para la combinación seleccionada',
					},
					{ status: 400 }
				)
			}
			finalIdPpc = ppcResult.data.idProductPercentageCommission
		}

		const catalogProduct =
			existingBusiness.productPercentageCommission?.productConfiguration?.product
		let companyName = catalogProduct?.company?.name ?? ''
		let productName = catalogProduct?.name ?? ''
		const currentProductId =
			existingBusiness.productPercentageCommission?.productConfiguration?.idProduct

		if (idProduct !== undefined && idProduct !== currentProductId) {
			const prod = await prisma.product.findUnique({
				where: { idProduct },
				include: { company: true },
			})
			if (!prod) {
				return NextResponse.json(
					{ data: null, error: 'Producto no encontrado' },
					{ status: 400 }
				)
			}
			companyName = prod.company.name
			productName = prod.name
		}

		if (idBuyPeriodicity !== undefined && idBuyPeriodicity !== existingBusiness.idBuyPeriodicity) {
			const bp = await prisma.buyPeriodicity.findUnique({ where: { idBuyPeriodicity } })
			if (!bp) {
				return NextResponse.json(
					{ data: null, error: 'Periodicidad no encontrada' },
					{ status: 400 }
				)
			}
			resolvedPeriodicityName = bp.name
		}

		const periodicityRejection = mfundPeriodicityError({
			companyName,
			productName,
			periodicityName: resolvedPeriodicityName,
		})
		if (periodicityRejection) {
			return NextResponse.json(
				{ data: null, error: periodicityRejection },
				{ status: 400 }
			)
		}

		// 2. Calcular numAportes si cambia plazo o periodicidad o producto (por la compañía) o si se envía manualmente
		if (term !== undefined || idBuyPeriodicity !== undefined || idProduct !== undefined || numAportes !== undefined) {
			if (numAportes !== undefined) {
				finalNumAportes = numAportes
			} else {
				const targetTerm = term ?? existingBusiness.term

				finalNumAportes = calculateNumAportes({
					termYears: targetTerm ?? null,
					periodicityName: resolvedPeriodicityName,
					companyName,
					productName,
				})
			}

			if (finalNumAportes !== (existingBusiness.numAportes ?? 0)) {
				shouldSyncPayments = true
			}
		}

		// Si el negocio recién se emite, crear los payments (no existían en VENTA_EFECTUADA)
		const becomesEmitidoEarly = Boolean(contract) &&
			existingBusiness.status === BUSINESS_STATUS.VENTA_EFECTUADA
		if (becomesEmitidoEarly) {
			shouldSyncPayments = true
		}

		// 3. Validar duplicado de contrato
		if (contract && contract !== existingBusiness.contract) {
			const duplicate = await prisma.business.findFirst({
				where: { contract, NOT: { idBusiness: businessId } },
			})
			if (duplicate) {
				return NextResponse.json(
					{ data: null, error: `El contrato '${contract}' ya está en uso (#${duplicate.idBusiness})` },
					{ status: 409 }
				)
			}
		}

		// --- DERIVACIÓN DE ESTADO (antes de la transacción para evitar duplicación) ---
		const newStatus = contract && existingBusiness.status === BUSINESS_STATUS.VENTA_EFECTUADA
			? BUSINESS_STATUS.EMITIDO
			: existingBusiness.status

		const becomesEmitido = Boolean(contract) &&
			existingBusiness.status === BUSINESS_STATUS.VENTA_EFECTUADA &&
			newStatus === BUSINESS_STATUS.EMITIDO

		const resolvedDateIssued = dateIssued !== undefined
			? (dateIssued ? new Date(dateIssued) : null)
			: (becomesEmitido ? (existingBusiness.dateIssued ?? new Date()) : existingBusiness.dateIssued)

		const dateIssuedChanged = dateIssued !== undefined &&
			(dateIssued ? new Date(dateIssued).getTime() : 0) !== (existingBusiness.dateIssued ? new Date(existingBusiness.dateIssued).getTime() : 0)

		const isEmittedStatus = newStatus === BUSINESS_STATUS.EMITIDO || newStatus === BUSINESS_STATUS.FONDEADO

		// --- TRANSACCIÓN: solo la actualización del negocio y sincronización estructural de aportes ---
		const updatedBusiness = await prisma.$transaction(async (tx) => {
			if (changesFundedStructure) {
				await assertFundedStructureUnlocked(tx, businessId)
			}

			const updateData: Prisma.BusinessUpdateInput = {
				contract: contract !== undefined ? (contract || null) : undefined,
				clientOrigin: idClientOrigin !== undefined ? { connect: { idClientOrigin } } : undefined,
				currency: idCurrency !== undefined ? { connect: { idCurrency } } : undefined,
				buyPeriodicity: idBuyPeriodicity !== undefined ? { connect: { idBuyPeriodicity } } : undefined,
				term: term !== undefined ? term : undefined,
				value: value !== undefined ? value : undefined,
				status: newStatus,
				productPercentageCommission: { connect: { idProductPercentageCommission: finalIdPpc } },
				numAportes: finalNumAportes,
			}

			if (idUser !== undefined && !isNotDraft) {
				updateData.user = { connect: { idUser: idUser } }
			}

			if (dateIssued !== undefined) {
				updateData.dateIssued = dateIssued ? new Date(dateIssued) : null
			} else if (becomesEmitido) {
				updateData.dateIssued = existingBusiness.dateIssued ?? new Date()
			}

			const updated = await tx.business.update({
				where: { idBusiness: businessId },
				data: updateData,
				include: businessWithRelations,
			})

			if (shouldSyncPayments) {
				await syncPaymentsStructure(tx, {
					businessId,
					newStatus,
					resolvedDateIssued,
					resolvedPeriodicityName,
					finalNumAportes,
				})
			}

			return updated
		})

		// --- POST-TRANSACCIÓN: recalcular fechas esperadas (no requiere atomicidad con el negocio) ---
		const needsDateRecalculation = !shouldSyncPayments &&
			(dateIssuedChanged || becomesEmitido) &&
			isEmittedStatus &&
			resolvedDateIssued !== null &&
			resolvedPeriodicityName !== null

		if (needsDateRecalculation) {
			await recalculatePaymentExpectedDates(prisma, {
				businessId,
				resolvedDateIssued: resolvedDateIssued!,
				resolvedPeriodicityName: resolvedPeriodicityName!,
				finalNumAportes,
			})
		}

		// --- TAREAS POST-ACTUALIZACIÓN ---

		if (!updatedBusiness) {
			throw new Error('La actualización del negocio no devolvió datos')
		}

		// A. Cambio de origen o PPC -> Recalcular comisiones
		// Skipped for PARTNER_EXTERNAL: nothing to redistribute; the origin is already persisted above.
		if (
			!finalLevel.isDistributionExcluded &&
			(idClientOrigin !== undefined || finalIdPpc !== existingBusiness.idProductPercentageCommission)
		) {
			try {
				await recalcularComisionesPorCambioOrigen(
					businessId,
					idClientOrigin ?? existingBusiness.idClientOrigin,
					{ idUser: currentUser.idUser, name: currentUser.name }
				)
			} catch (e) {
				console.error('Error recalcular comisiones:', e)
			}
		}

		// B. Sincronización con Pre-liquidación (Rezagados)
		if (idSettlementCommission && contract) {
			await sincronizarYCalcularRegistroRezagado(idSettlementCommission, contract, {
				userId: currentUser.idUser,
				email: session.user.email,
				ipAddress: getClientIp(new Headers(request.headers)),
				userAgent: getUserAgent(new Headers(request.headers)),
			})
		}

		// C. Auditoría
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
				newStatus: updatedBusiness.status,
				...validationResult.data,
				wasPrivileged: isPrivileged,
			}),
		})

		const entity = prismaBusinessToEntity(updatedBusiness)
		return NextResponse.json({ data: entity })
	} catch (error) {
		if (error instanceof FundedPaymentsConflictError) {
			return NextResponse.json(
				{ data: null, error: FUNDED_STRUCTURE_CONFLICT_MESSAGE },
				{ status: 409 }
			)
		}
		console.error('Error al actualizar negocio:', error)
		return NextResponse.json(
			{ data: null, error: 'Error interno del servidor' },
			{ status: 500 }
		)
	}
}

// ---------------------------------------------------------------------------
// Helpers de sincronización de aportes
// ---------------------------------------------------------------------------

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

const FINANCIAL_PAYMENT_STATUSES = [
	AnnualPaymentStatus.FONDEADO,
	AnnualPaymentStatus.EN_CARTERA,
	AnnualPaymentStatus.PAGO_ANTICIPADO,
	AnnualPaymentStatus.CARTERA_PAGADO,
] as const

const FUNDED_STRUCTURE_CONFLICT_MESSAGE =
	'No se puede cambiar el plazo, la periodicidad, el producto o el número de aportes de un negocio fondeado que ya tiene aportes con estado financiero.'

class FundedPaymentsConflictError extends Error {
	constructor() {
		super(FUNDED_STRUCTURE_CONFLICT_MESSAGE)
		this.name = 'FundedPaymentsConflictError'
	}
}

/**
 * Locks the business and its payments, then rejects a structural edit when a
 * payment already has a financial status. The lock is held until the
 * transaction ends, so a concurrent funding transition waits instead of
 * landing between the check and `payment.deleteMany`.
 */
async function assertFundedStructureUnlocked(
	tx: PrismaTx,
	businessId: number
): Promise<void> {
	await tx.$queryRaw`
		SELECT "id_business" FROM "business" WHERE "id_business" = ${businessId} FOR UPDATE
	`
	await tx.$queryRaw`
		SELECT "id_annual_payment" FROM "payments" WHERE "id_business" = ${businessId} FOR UPDATE
	`

	const financialPayments = await tx.payment.count({
		where: {
			idBusiness: businessId,
			status: { in: [...FINANCIAL_PAYMENT_STATUSES] },
		},
	})
	if (financialPayments > 0) {
		throw new FundedPaymentsConflictError()
	}
}

interface SyncPaymentsStructureParams {
	businessId: number
	newStatus: string
	resolvedDateIssued: Date | null
	resolvedPeriodicityName: string | null
	finalNumAportes: number
}

async function syncPaymentsStructure(tx: PrismaTx, params: SyncPaymentsStructureParams): Promise<void> {
	const { businessId, newStatus, resolvedDateIssued, resolvedPeriodicityName, finalNumAportes } = params

	const isEmitted = newStatus === BUSINESS_STATUS.EMITIDO || newStatus === BUSINESS_STATUS.FONDEADO

	const existingPayments = await tx.payment.findMany({
		where: { idBusiness: businessId },
		orderBy: { installmentIndex: 'asc' },
	})

	await tx.payment.deleteMany({ where: { idBusiness: businessId } })

	if (finalNumAportes === 0 || !isEmitted || !resolvedDateIssued || !resolvedPeriodicityName) return

	const expectedDates = calculateExpectedDates(resolvedDateIssued, finalNumAportes, resolvedPeriodicityName)
	const now = new Date()

	const paymentsToCreate = Array.from({ length: finalNumAportes }, (_, i) => {
		const installmentIndex = i + 1
		const previous = existingPayments.find(p => p.installmentIndex === installmentIndex)
		const calculatedDate = expectedDates[i] ?? null
		return {
			idBusiness: businessId,
			installmentIndex,
			status: previous?.status ?? AnnualPaymentStatus.SIN_FONDEAR,
			expectedDate: calculatedDate,
			dateAnchored: previous?.dateAnchored ?? null,
			portfolioDate: previous?.portfolioDate ?? null,
			earlyPaymentDate: previous?.earlyPaymentDate ?? null,
			createdAt: previous?.createdAt ?? now,
			updatedAt: now,
		}
	})

	await tx.payment.createMany({ data: paymentsToCreate })
}

interface RecalculatePaymentDatesParams {
	businessId: number
	resolvedDateIssued: Date
	resolvedPeriodicityName: string
	finalNumAportes: number
}

async function recalculatePaymentExpectedDates(
	db: typeof prisma,
	params: RecalculatePaymentDatesParams
): Promise<void> {
	const { businessId, resolvedDateIssued, resolvedPeriodicityName, finalNumAportes } = params

	const expectedDates = calculateExpectedDates(resolvedDateIssued, finalNumAportes, resolvedPeriodicityName)
	const payments = await db.payment.findMany({ where: { idBusiness: businessId } })
	const now = new Date()

	const recalculable = payments.filter(
		p => p.status !== AnnualPaymentStatus.EN_CARTERA && p.status !== AnnualPaymentStatus.PAGO_ANTICIPADO
	)

	await Promise.all(
		recalculable.map(p => {
			const newDate = expectedDates[p.installmentIndex - 1] ?? null
			// dateAnchored is the REAL funding date (cron or manual) — recalculating
			// the schedule must never stamp or overwrite it.
			return db.payment.update({
				where: { idAnnualPayment: p.idAnnualPayment },
				data: { expectedDate: newDate, updatedAt: now },
			})
		})
	)
}
