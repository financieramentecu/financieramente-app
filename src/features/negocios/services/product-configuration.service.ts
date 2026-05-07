/**
 * Servicio de configuración de producto y PPC para nuevos negocios.
 * Contiene todas las llamadas a Prisma relacionadas con ProductConfiguration
 * y ProductPercentajeCommision para esta feature.
 */

import { prisma } from '@/lib/prisma'
import type { ProductPercentageCommission } from '@prisma/client'

export interface GetPpcForNewBusinessesParams {
	idProduct: number
	idCategory: number
}

export interface GetPpcForNewBusinessesResult {
	configExists: boolean
	ppc: ProductPercentageCommission | null
}

/**
 * Obtiene el PPC activo para nuevos negocios según ProductConfiguration.
 *
 * Busca ProductConfiguration por (idProduct, idCategory) únicamente.
 * Si no existe la configuración lanza un error descriptivo — NO hay fallback silencioso.
 *
 * @param params - Parámetros de búsqueda (producto y categoría del agente)
 * @returns Objeto con configExists (true) y ppc.
 * @throws Error si no existe configuración para el par (idProduct, idCategory).
 */
export async function getPpcForNewBusinesses(
	params: GetPpcForNewBusinessesParams
): Promise<GetPpcForNewBusinessesResult> {
	const { idProduct, idCategory } = params

	const productConfiguration = await prisma.productConfiguration.findUnique({
		where: {
			idProduct_idCategory: {
				idProduct,
				idCategory,
			},
		},
		include: {
			productPercentageCommissionNewBusinesses: true,
		},
	})

	if (!productConfiguration) {
		throw new Error(
			'No existe configuración de distribución para el producto y categoría seleccionados. Configurá la distribución antes de continuar.'
		)
	}

	return {
		configExists: true,
		ppc: productConfiguration.productPercentageCommissionNewBusinesses,
	}
}

export type OriginValidationResult =
	| { valid: true }
	| { valid: false; reason: string }

/**
 * Valida que la combinación (idCategory, idProduct) tenga:
 *  1. ProductConfiguration existente
 *  2. Al menos un ProductPercentageCommission activo
 *  3. Al menos una ProductPercentageCommissionCategory activa en ese PPC
 *
 * Devuelve `{ valid: true }` si todo está presente, o `{ valid: false, reason }` si falta algo.
 */
export async function validateProductConfigurationExists(
	idCategory: number,
	idProduct: number
): Promise<OriginValidationResult> {
	const productConfiguration = await prisma.productConfiguration.findUnique({
		where: {
			idProduct_idCategory: {
				idProduct,
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
			reason:
				'No existe configuración de distribución para el producto y categoría del negocio. Configurá la distribución antes de continuar.',
		}
	}

	const activePpc = productConfiguration.productPercentageCommissions[0]
	if (!activePpc) {
		return {
			valid: false,
			reason:
				'La configuración no tiene comisiones activas configuradas.',
		}
	}

	if (activePpc.productPercentageCommissionCategories.length === 0) {
		return {
			valid: false,
			reason:
				'La configuración no tiene reglas de distribución configuradas.',
		}
	}

	return { valid: true }
}
