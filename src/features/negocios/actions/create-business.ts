'use server'

import { prisma } from '@/lib/prisma'
import { Business } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { z } from 'zod'
import { determineBusinessStatus } from '@/features/negocios/types/business-status.types'
import { findProductPercentageCommission } from './find-product-percentage-commission'

/**
 * Schema de validación para crear un negocio
 */
const createBusinessSchema = z.object({
	contract: z.string().optional(),
	term: z.number().int().positive('El plazo debe ser mayor a 0').optional(),
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
 * determina el estado basado en el contrato y crea el negocio en la base de datos.
 *
 * @param data - Datos del negocio a crear
 * @returns ApiResponse con el negocio creado o un error
 */
export async function createBusiness(
	data: CreateBusinessInput
): Promise<ApiResponse<Business>> {
	try {
		// Validar los datos de entrada
		const validatedData = createBusinessSchema.parse(data)

		// Obtener idCategoria del agente
		const user = await prisma.user.findUnique({
			where: {
				idUser: validatedData.idUser,
			},
			select: {
				idCategoria: true,
			},
		})

		if (!user) {
			return {
				data: null,
				error: 'El agente seleccionado no existe',
			}
		}

		if (!user.idCategoria) {
			return {
				data: null,
				error: 'El agente seleccionado no tiene una categoría asignada',
			}
		}

		// Buscar ProductPercentageCommission
		const commisionResult = await findProductPercentageCommission({
			idProduct: validatedData.idProduct,
			idClientOrigin: validatedData.idClientOrigin,
			idCategory: user.idCategoria,
		})

		if ('error' in commisionResult) {
			return commisionResult
		}

		// Determinar estado basado en el campo contract
		// Si contract es una cadena vacía o undefined, se considera como sin contrato
		const contractValue =
			validatedData.contract && validatedData.contract.trim().length > 0
				? validatedData.contract.trim()
				: undefined
		const status = determineBusinessStatus(contractValue)

		// Crear el negocio
		const business = await prisma.business.create({
			data: {
				contract: contractValue || null,
				term: validatedData.term || null,
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
			},
		})

		return {
			data: business,
		}
	} catch (error) {
		// Manejar errores de validación de Zod
		if (error instanceof z.ZodError) {
			const firstError = error.issues[0]
			return {
				data: null,
				error: firstError?.message || 'Error de validación',
			}
		}

		// Manejar errores de Prisma (duplicados, etc.)
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
