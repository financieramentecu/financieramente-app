'use server'

import { AnnualPaymentStatus, type Business } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import {
	BUSINESS_TERM_MAX,
} from '@/features/negocios/lib/business-term-limits'
import {
	BUSINESS_STATUS,
	determineBusinessStatus,
} from '@/features/negocios/types/business-status.types'
import { calculateNumAportes } from '@/features/negocios/lib/calculate-num-aportes'
import { calculateExpectedDates } from '@/features/negocios/lib/calculate-expected-dates'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { findProductPercentageCommission } from './find-product-percentage-commission'

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
		const validatedData = createBusinessSchema.parse(data)

		const user = await prisma.user.findUnique({
			where: {
				idUser: validatedData.idUser,
			},
			select: {
				idLevel: true,
			},
		})

		if (!user) {
			return {
				data: null,
				error: 'El agente seleccionado no existe',
			}
		}

		if (!user.idLevel) {
			return {
				data: null,
				error: 'El agente seleccionado no tiene un nivel asignado',
			}
		}

		const commisionResult = await findProductPercentageCommission({
			idProduct: validatedData.idProduct,
			idLevel: user.idLevel,
		})

		if ('error' in commisionResult) {
			return commisionResult
		}

		if (!commisionResult.data) {
			return {
				data: null,
				error: 'Este producto no tiene una configuración de comisiones activa.',
			}
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

		const numAportes = calculateNumAportes({
			termYears: validatedData.term ?? null,
			periodicityName,
			companyName: productWithCompany?.company?.name ?? null,
			productName: productWithCompany?.name ?? null,
		})

		const business = await prisma.$transaction(async (tx) => {
			const issuedAt =
				status === BUSINESS_STATUS.EMITIDO ? new Date() : null
			const created = await tx.business.create({
				data: {
					contract: contractValue || null,
					term: validatedData.term ?? null,
					value: validatedData.value,
					observations: validatedData.observations || null,
					idBuyPeriodicity: validatedData.idBuyPeriodicity || null,
					idUser: validatedData.idUser,
					idClient: validatedData.idClient,
					idProductPercentageCommission:
						commisionResult.data.idProductPercentageCommission,
					idCurrency: validatedData.idCurrency,
					idClientOrigin: validatedData.idClientOrigin,
					status,
					dateIssued: issuedAt,
					numAportes,
				},
			})

			if (numAportes > 0) {
				const rowTimestamp = new Date()
				let expectedDates: Date[] = []
				if (status === BUSINESS_STATUS.EMITIDO && issuedAt && periodicityName) {
					expectedDates = calculateExpectedDates(issuedAt, numAportes, periodicityName)
				}

				await tx.payment.createMany({
					data: Array.from({ length: numAportes }, (_, i) => ({
						idBusiness: created.idBusiness,
						installmentIndex: i + 1,
						status: AnnualPaymentStatus.SIN_FONDEAR,
						expectedDate: expectedDates[i] || null,
						createdAt: rowTimestamp,
						updatedAt: rowTimestamp,
					})),
				})
			}

			return created
		})

		return {
			data: business,
		}
	} catch (error) {
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
