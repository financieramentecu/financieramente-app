/**
 * Servicio de configuración de producto y PPC para nuevos negocios.
 * Contiene todas las llamadas a Prisma relacionadas con ProductConfiguration
 * y ProductPercentajeCommision para esta feature.
 */

import { prisma } from '@/lib/prisma'
import type { ProductPercentageCommission } from '@prisma/client'

export interface GetPpcForNewBusinessesParams {
	idProduct: number
	idClientOrigin: number
	idCategory: number
}

export interface GetPpcForNewBusinessesResult {
	configExists: boolean
	ppc: ProductPercentageCommission | null
}

/**
 * Obtiene el PPC activo para nuevos negocios según ProductConfiguration.
 *
 * Busca ProductConfiguration por (idProduct, idClientOrigin, idCategory)
 * y devuelve el ProductPercentageCommission designado en
 * idProductPercentageCommissionNewBusinesses.
 *
 * @param params - Parámetros de búsqueda (producto, origen, categoría del agente)
 * @returns Objeto con configExists (si existe la combinación) y ppc.
 * `ppc` puede venir de la configuración específica o de un fallback global.
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
			productPercentageCommissionNewBusinesses: true,
		},
	})

	if (productConfiguration?.productPercentageCommissionNewBusinesses) {
		return {
			configExists: true,
			ppc: productConfiguration.productPercentageCommissionNewBusinesses,
		}
	}

	const fallbackPpc = await prisma.productPercentageCommission.findFirst({
		where: {
			active: true,
			productPercentageCommissionCategories: {
				some: {
					active: true,
				},
			},
		},
		orderBy: {
			idProductPercentageCommission: 'asc',
		},
	})

	return {
		configExists: Boolean(productConfiguration),
		ppc: fallbackPpc,
	}
}

export type OriginValidationResult =
	| { valid: true }
	| { valid: false; reason: string }

/**
 * Valida que la combinación (idCategory, idProduct, idClientOrigin) tenga:
 *  1. ProductConfiguration existente
 *  2. Al menos un ProductPercentageCommission activo
 *  3. Al menos una ProductPercentageCommissionCategory activa en ese PPC
 *
 * Devuelve `{ valid: true }` si todo está presente, o `{ valid: false, reason }` si falta algo.
 */
export async function validateProductConfigurationExists(
	idCategory: number,
	idProduct: number,
	idClientOrigin: number
): Promise<OriginValidationResult> {
	const productConfiguration = await prisma.productConfiguration.findUnique({
		where: {
			idProduct_idClientOrigin_idCategory: {
				idProduct,
				idClientOrigin,
				idCategory,
			},
		},
		include: {
			productPercentageCommissions: {
				where: { active: true },
				include: {
					productPercentageCommissionCategories: {
						where: { active: true },
					},
				},
			},
		},
	})

	if (!productConfiguration) {
		return {
			valid: false,
			reason: 'No existe configuración de distribución para el origen, producto y categoría del negocio. Configurá la distribución antes de cambiar el origen.',
		}
	}

	const activePpc = productConfiguration.productPercentageCommissions[0]
	if (!activePpc) {
		return {
			valid: false,
			reason: 'La configuración de ese origen no tiene comisiones activas configuradas.',
		}
	}

	if (activePpc.productPercentageCommissionCategories.length === 0) {
		return {
			valid: false,
			reason: 'La configuración de ese origen no tiene reglas de distribución configuradas.',
		}
	}

	return { valid: true }
}
