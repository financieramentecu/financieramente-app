'use server'

import { AnnualPaymentStatus, type Business } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { BUSINESS_TERM_MAX } from '@/features/negocios/lib/business-term-limits'
import {
	BUSINESS_STATUS,
	determineBusinessStatus,
} from '@/features/negocios/types/business-status.types'
import { calculateNumAportes } from '@/features/negocios/lib/calculate-num-aportes'
import { mfundPeriodicityError } from '@/features/negocios/lib/mfund-periodicity'
import { calculateExpectedDates } from '@/features/negocios/lib/calculate-expected-dates'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { linkLeadToBusinessTx } from '@/features/leads/services/lead-conversion.service'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import { identityNumberSchema } from '@/features/negocios/lib/identity-number.schema'
import {
	PolicyholderLinkError,
	upsertPolicyholder,
} from '@/features/policyholders/services/policyholder.service'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { headers } from 'next/headers'
import { resolveBusinessCreationContext } from '@/features/negocios/services/business-creation.service'
import { toAccessUser } from '@/features/negocios/lib/session-access-user'

/**
 * Schema de validación para crear un negocio
 */
const createBusinessSchema = z.object({
	contract: z.string().optional(),
	term: z
		.number()
		.int()
		.min(0, 'El plazo no puede ser negativo')
		.max(
			BUSINESS_TERM_MAX,
			`El plazo no puede ser mayor a ${BUSINESS_TERM_MAX}`
		)
		.optional(),
	value: z.number().positive('El valor debe ser mayor a 0'),
	observations: z.string().optional(),
	idBuyPeriodicity: z.number().int().positive().optional(),
	idUser: z.number().int().positive('El agente es obligatorio'),
	idClient: z.number().int().positive('El cliente es obligatorio'),
	idProduct: z.number().int().positive('El producto es obligatorio'),
	idCurrency: z.number().int().positive('La moneda es obligatoria'),
	idClientOrigin: z
		.number()
		.int()
		.positive('El origen del cliente es obligatorio'),
	/**
	 * Optional lead-to-business conversion link (leads-crm-sync feature).
	 * When provided, `linkLeadToBusinessTx` is called inside the same
	 * transaction that creates the business — see design D10.
	 */
	idLead: z.number().int().positive().optional(),
	clientIsPolicyholder: z.boolean().optional(),
	policyholder: z
		.object({
			typeIdentity: z
				.string()
				.trim()
				.min(1, 'El tipo de documento del tomador es obligatorio'),
			identityNumber: identityNumberSchema.transform((value) =>
				value.toUpperCase()
			),
			email: z.email('El correo del tomador es inválido'),
			name: z
				.string()
				.trim()
				.min(2, 'Los nombres del tomador son obligatorios'),
			lastName: z
				.string()
				.trim()
				.min(2, 'Los apellidos del tomador son obligatorios'),
			phone: z
				.string()
				.trim()
				.min(1, 'El teléfono del tomador es obligatorio')
				.regex(/^[0-9\s\-+]+$/, 'Formato de contacto inválido'),
		})
		.optional(),
})

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>

/**
 * Server Action para crear un negocio
 *
 * Valida los datos, obtiene la categoría del agente, busca ProductPercentageCommission,
 * determina el estado basado en el campo contract y crea el negocio en la base de datos.
 *
 * @param data - Datos del negocio a crear
 * @returns ApiResponse con el negocio creado o un error
 */
export async function createBusiness(
	data: CreateBusinessInput
): Promise<ApiResponse<Business>> {
	try {
		const guard = await requireWriteAccess()
		if (!guard.ok) {
			return {
				data: null,
				error: guard.response.status === 401 ? 'No autorizado' : 'Sin permisos',
			}
		}

		const validatedData = createBusinessSchema.parse(data)

		// NEG-02 / PA-04: the owner is decided server-side (a PARTNER always owns
		// their own business) and the PPC is resolved with the OWNER's level.
		// Nothing is written before this succeeds.
		const creation = await resolveBusinessCreationContext({
			sessionUser: toAccessUser(guard.session),
			requestedIdUser: validatedData.idUser,
			idProduct: validatedData.idProduct,
		})

		if (!creation.ok) {
			return { data: null, error: creation.error }
		}

		const contractValue =
			validatedData.contract && validatedData.contract.trim().length > 0
				? validatedData.contract.trim()
				: undefined
		const status = determineBusinessStatus(contractValue)

		// Resolve names needed for calculateNumAportes
		let periodicityName: string | null = null
		if (validatedData.idBuyPeriodicity != null) {
			const bp = await prisma.buyPeriodicity.findUnique({
				where: { idBuyPeriodicity: validatedData.idBuyPeriodicity },
				select: { name: true },
			})
			periodicityName = bp?.name ?? null
		}

		const productWithCompany = await prisma.product.findUnique({
			where: { idProduct: validatedData.idProduct },
			select: {
				name: true,
				company: { select: { name: true } },
			},
		})

		const companyName = productWithCompany?.company?.name ?? null
		const productName = productWithCompany?.name ?? null
		const periodicityRejection = mfundPeriodicityError({
			companyName,
			productName,
			periodicityName,
		})
		if (periodicityRejection) {
			return { data: null, error: periodicityRejection }
		}

		const numAportes = calculateNumAportes({
			termYears: validatedData.term ?? null,
			periodicityName,
			companyName,
			productName,
		})

		const samePerson = validatedData.clientIsPolicyholder !== false
		if (!samePerson && !validatedData.policyholder) {
			return {
				data: null,
				error: 'Los datos del tomador son obligatorios',
			}
		}

		const business = await prisma.$transaction(async (tx) => {
			let idPolicyholder: number | null = null
			if (!samePerson && validatedData.policyholder) {
				const upserted = await upsertPolicyholder(
					tx,
					validatedData.policyholder
				)
				if ('error' in upserted) {
					throw new PolicyholderLinkError(upserted.error)
				}
				idPolicyholder = upserted.idPolicyholder
			}

			const issuedAt = status === BUSINESS_STATUS.EMITIDO ? new Date() : null
			const created = await tx.business.create({
				data: {
					contract: contractValue || null,
					term: validatedData.term ?? null,
					value: validatedData.value,
					observations: validatedData.observations || null,
					idBuyPeriodicity: validatedData.idBuyPeriodicity || null,
					idUser: creation.idUser,
					idClient: validatedData.idClient,
					idProductPercentageCommission: creation.idProductPercentageCommission,
					idCurrency: validatedData.idCurrency,
					idClientOrigin: validatedData.idClientOrigin,
					status,
					dateIssued: issuedAt,
					numAportes,
					clientIsPolicyholder: samePerson,
					idPolicyholder,
				},
			})

			if (
				numAportes > 0 &&
				status === BUSINESS_STATUS.EMITIDO &&
				issuedAt &&
				periodicityName
			) {
				const rowTimestamp = new Date()
				const expectedDates = calculateExpectedDates(
					issuedAt,
					numAportes,
					periodicityName
				)

				await tx.payment.createMany({
					data: Array.from({ length: numAportes }, (_, i) => ({
						idBusiness: created.idBusiness,
						installmentIndex: i + 1,
						status: AnnualPaymentStatus.SIN_FONDEAR,
						expectedDate: expectedDates[i] ?? null,
						dateAnchored: null,
						createdAt: rowTimestamp,
						updatedAt: rowTimestamp,
					})),
				})
			}

			if (validatedData.idLead != null) {
				// Re-checked inside this same transaction: an already-converted
				// lead throws here, which rolls back the whole transaction —
				// no orphaned Business is ever created.
				await linkLeadToBusinessTx(tx, validatedData.idLead, created.idBusiness)
			}

			return created
		})

		const reqHeaders = await headers()
		const userId = guard.session.user.id
			? parseInt(guard.session.user.id, 10)
			: undefined
		await logAuditEvent({
			userId: Number.isFinite(userId) ? userId : undefined,
			email: guard.session.user.email ?? undefined,
			ipAddress: getClientIp(reqHeaders),
			userAgent: getUserAgent(reqHeaders),
			action: AuditAction.BUSINESS_POLICYHOLDER_LINKED,
			details: samePerson
				? `Negocio ${business.idBusiness} creado con el cliente como tomador`
				: `Negocio ${business.idBusiness} creado con tomador independiente`,
		})

		return {
			data: business,
		}
	} catch (error) {
		if (error instanceof PolicyholderLinkError) {
			return { data: null, error: error.message }
		}
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0]
			return {
				data: null,
				error: firstError?.message || 'Error de validación',
			}
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2002') {
				return {
					data: null,
					error: 'Ya existe un negocio con este número de contrato',
				}
			}
			if (error.code === 'P2003') {
				return {
					data: null,
					error: 'Error de referencia: uno de los datos relacionados no existe',
				}
			}
		}

		console.error('Error creating business:', error)
		return {
			data: null,
			error: 'Error al crear el negocio. Por favor, intenta de nuevo.',
		}
	}
}
