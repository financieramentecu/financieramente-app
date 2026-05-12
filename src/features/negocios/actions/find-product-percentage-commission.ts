'use server'

import { ProductPercentageCommission } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { getPpcForNewBusinesses } from '../services/product-configuration.service'

/**
 * Parámetros para buscar ProductPercentageCommission para nuevos negocios
 */
export interface FindProductPercentageCommissionInput {
	idProduct: number
	idLevel: number
}

/**
 * Server Action: obtiene el PPC activo para nuevos negocios según ProductConfiguration.
 *
 * Delega la consulta a Prisma al servicio product-configuration.service.
 * Si no existe configuración para el par (idProduct, idLevel), retorna el error descriptivo.
 *
 * @param params - Parámetros de búsqueda (producto y nivel del agente)
 * @returns ApiResponse con ProductPercentageCommission para nuevos negocios o error
 */
export async function findProductPercentageCommission(
	params: FindProductPercentageCommissionInput
): Promise<ApiResponse<ProductPercentageCommission>> {
	try {
		const { configExists, ppc } = await getPpcForNewBusinesses(params)

		if (ppc) {
			return {
				data: ppc,
			}
		}

		if (!configExists) {
			return {
				data: null,
				error:
					'No hay configuración de comisión para esta combinación de producto y categoría.',
			}
		}

		return {
			data: null,
			error:
				'No hay configuración de comisión para nuevos negocios en esta combinación producto/categoría.',
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('Error finding product percentaje commision:', message, error)
		return {
			data: null,
			error: message,
		}
	}
}
