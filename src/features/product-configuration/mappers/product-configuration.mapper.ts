/**
 * Mapper for transforming ProductConfiguration from Prisma to domain type
 * Single responsibility: database data conversion to domain
 */

import { Prisma } from '@prisma/client'
import type { ProductConfiguration } from '../types/product-configuration.types'

/**
 * Prisma result type with includes using Prisma's payload type helper
 */
export type PrismaProductConfigurationWithIncludes = Prisma.ProductConfigurationGetPayload<{
	include: {
		product: {
			select: {
				idProduct: true
				name: true
				company: {
					select: { idCompany: true; name: true }
				}
			}
		}
		clientOrigin: {
			select: { idClientOrigin: true; name: true }
		}
		category: {
			select: { idCategory: true; name: true }
		}
		productPercentajeCommisionNewBusinesses: {
			select: { idProductPercentajeCommision: true; active: true }
		}
	}
}>

/**
 * Transforms a Prisma ProductConfiguration (with includes) to domain type
 */
export function prismaProductConfigToProductConfig(
	prisma: PrismaProductConfigurationWithIncludes
): ProductConfiguration {
	return {
		id: prisma.id,
		idProduct: prisma.idProduct,
		idClientOrigin: prisma.idClientOrigin,
		idCategory: prisma.idCategory,
		code: prisma.code ?? '',
		active: prisma.active,
		idProductPercentajeCommisionNewBusinesses:
			prisma.idProductPercentajeCommisionNewBusinesses,
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
		ppcNewBusinesses: prisma.productPercentajeCommisionNewBusinesses
			? {
				id: prisma.productPercentajeCommisionNewBusinesses
					.idProductPercentajeCommision,
				active:
					prisma.productPercentajeCommisionNewBusinesses.active,
			}
			: null,
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
