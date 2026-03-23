'use server'

import { ProductPercentageCommission } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { getPpcForNewBusinesses } from '../services/product-configuration.service'

/**
 * Parámetros para buscar ProductPercentageCommission para nuevos negocios
 */
export interface FindProductPercentageCommissionInput {
	idProduct: number
	idClientOrigin: number
	idCategory: number
}

/**
 * Server Action: obtiene el PPC activo para nuevos negocios según ProductConfiguration.
 *
 * Delega la consulta a Prisma al servicio product-configuration.service.
 * Valida el resultado y devuelve ApiResponse con el PPC o mensaje de error.
 *
 * @param params - Parámetros de búsqueda (producto, origen, categoría del agente)
 * @returns ApiResponse con ProductPercentageCommission para nuevos negocios o error
 */
export async function findProductPercentageCommission(
	params: FindProductPercentageCommissionInput
): Promise<ApiResponse<ProductPercentageCommission>> {
	try {
		const { configExists, ppc } = await getPpcForNewBusinesses(params)

		if (!configExists) {
			return {
				data: null,
				error:
					'No hay configuración de comisión para esta combinación de producto, origen y categoría.',
			}
		}

		if (!ppc) {
			return {
				data: null,
				error:
					'No hay configuración de comisión para nuevos negocios en esta combinación producto/origen/categoría.',
			}
		}

		return {
			data: ppc,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('Error finding product percentaje commision:', message, error)
		return {
			data: null,
			error:
				'Error al buscar la configuración de comisión. Por favor, intenta de nuevo.',
		}
	}
}
