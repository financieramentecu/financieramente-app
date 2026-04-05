/**
 * Mapper for transforming ProductConfiguration from Prisma to domain type
 * Single responsibility: database data conversion to domain
 */

import type { ProductConfiguration } from '../types/product-configuration.types'

/**
 * Prisma result type with includes using Prisma's payload type helper
 */
interface PrismaProductConfigurationWithIncludes {
	id: number
	idProduct: number
	idClientOrigin: number
	idCategory: number
	code: string | null
	active: boolean
	idProductPercentageCommissionNewBusinesses: number | null
	createdAt: Date
	updatedAt: Date
	product: {
		idProduct: number
		name: string
		company: { idCompany: number; name: string }
	}
	clientOrigin: { idClientOrigin: number; name: string }
	category: { idCategory: number; name: string }
	productPercentageCommissionNewBusinesses: {
		idProductPercentageCommission: number
		description: string | null
		active: boolean
	} | null
	productPercentageCommissions: Array<{
		idProductPercentageCommission: number
		description: string | null
		active: boolean
	}>
}

/**
 * Transforms a Prisma ProductConfiguration (with includes) to domain type
 */
export function prismaProductConfigToProductConfig(
	prisma: PrismaProductConfigurationWithIncludes
): ProductConfiguration {
	// Find the currently active distribution from the list
	const activeDistribution = prisma.productPercentageCommissions.find(
		(d) => d.active
	)

	return {
		id: prisma.id,
		idProduct: prisma.idProduct,
		idClientOrigin: prisma.idClientOrigin,
		idCategory: prisma.idCategory,
		code: prisma.code ?? '',
		active: prisma.active,
		idProductPercentageCommissionNewBusinesses:
			prisma.idProductPercentageCommissionNewBusinesses,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
		product: {
			idProduct: prisma.product.idProduct,
			name: prisma.product.name,
			company: {
				idCompany: prisma.product.company.idCompany,
				name: prisma.product.company.name,
			},
		},
		clientOrigin: {
			idClientOrigin: prisma.clientOrigin.idClientOrigin,
			name: prisma.clientOrigin.name,
		},
		category: {
			idCategory: prisma.category.idCategory,
			name: prisma.category.name,
		},
		ppcNewBusinesses: prisma.productPercentageCommissionNewBusinesses
			? {
					id: prisma.productPercentageCommissionNewBusinesses
						.idProductPercentageCommission,
					description:
						prisma.productPercentageCommissionNewBusinesses.description,
					active: prisma.productPercentageCommissionNewBusinesses.active,
				}
			: null,
		// Prioritize the active distribution's description, fallback to the linked one
		newBusinessesDistributionDescription:
			activeDistribution?.description ??
			prisma.productPercentageCommissionNewBusinesses?.description ??
			null,
	}
}

/**
 * Transforms a list of Prisma ProductConfigurations to domain types
 */
export function prismaProductConfigListToProductConfigs(
	prismaList: PrismaProductConfigurationWithIncludes[]
): ProductConfiguration[] {
	return prismaList.map(prismaProductConfigToProductConfig)
}
