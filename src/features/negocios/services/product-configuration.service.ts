/**
 * Servicio de configuración de producto y PPC para nuevos negocios.
 * Contiene todas las llamadas a Prisma relacionadas con ProductConfiguration
 * y ProductPercentajeCommision para esta feature.
 */

import { prisma } from '@/lib/prisma'
import type { ProductPercentajeCommision } from '@prisma/client'

export interface GetPpcForNewBusinessesParams {
	idProduct: number
	idClientOrigin: number
	idCategory: number
}

export interface GetPpcForNewBusinessesResult {
	configExists: boolean
	ppc: ProductPercentajeCommision | null
}

/**
 * Obtiene el PPC activo para nuevos negocios según ProductConfiguration.
 *
 * Busca ProductConfiguration por (idProduct, idClientOrigin, idCategory)
 * y devuelve el ProductPercentajeCommision designado en
 * idProductPercentajeCommisionNewBusinesses.
 *
 * @param params - Parámetros de búsqueda (producto, origen, categoría del agente)
 * @returns Objeto con configExists (si existe la combinación) y ppc (PPC para nuevos negocios o null)
 */
export async function getPpcForNewBusinesses(
	params: GetPpcForNewBusinessesParams
): Promise<GetPpcForNewBusinessesResult> {
	const { idProduct, idClientOrigin, idCategory } = params

	const productConfiguration = await prisma.productConfiguration.findUnique({
		where: {
			idProduct_idClientOrigin_idCategory: {
				idProduct,
				idClientOrigin,
				idCategory,
			},
		},
		include: {
			productPercentajeCommisionNewBusinesses: true,
		},
	})

	if (!productConfiguration) {
		return { configExists: false, ppc: null }
	}

	return {
		configExists: true,
		ppc: productConfiguration.productPercentajeCommisionNewBusinesses,
	}
}
