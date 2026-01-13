'use server'

import { prisma } from '@/lib/prisma'
import { ProductPercentajeCommision } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'

/**
 * Parámetros para buscar ProductPercentajeCommision
 */
export interface FindProductPercentajeCommisionInput {
	idProduct: number
	idClientOrigin: number
	idCategory: number
}

/**
 * Server Action para buscar ProductPercentajeCommision
 *
 * Busca una configuración de comisión que coincida con los parámetros dados:
 * - idProduct: ID del producto seleccionado
 * - idClientOrigin: ID del origen del cliente (del formulario)
 * - idCategory: ID de la categoría del agente seleccionado
 *
 * @param params - Parámetros de búsqueda
 * @returns ApiResponse con ProductPercentajeCommision encontrado o un error
 */
export async function findProductPercentajeCommision(
	params: FindProductPercentajeCommisionInput
): Promise<ApiResponse<ProductPercentajeCommision>> {
	try {
		const { idProduct, idClientOrigin, idCategory } = params

		// Buscar ProductPercentajeCommision con las condiciones especificadas
		const productPercentajeCommision =
			await prisma.productPercentajeCommision.findFirst({
				where: {
					idProduct,
					idClientOrigin,
					idCategory,
					active: true,
				},
			})

		if (!productPercentajeCommision) {
			return {
				data: null,
				error:
					'El producto, la categoría y el origen del cliente no tienen una comisión asignada',
			}
		}

		return {
			data: productPercentajeCommision,
		}
	} catch (error) {
		console.error('Error finding product percentaje commision:', error)
		return {
			data: null,
			error:
				'Error al buscar la configuración de comisión. Por favor, intenta de nuevo.',
		}
	}
}
