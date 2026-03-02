/**
 * Mapper para transformar Product de Prisma a Product type
 * Responsabilidad única: conversión de datos de base de datos a dominio
 */

import type { Product } from '../types/product.types'
import type { Prisma } from '@prisma/client'

type PrismaProductWithRelations = Prisma.ProductGetPayload<{
	include: {
		company: true
		typeProduct: true
	}
}>

/**
 * Transforma un Product de Prisma a Product type
 *
 * @param prisma - Product con relación company de Prisma
 * @returns Product para uso en la UI
 *
 * @example
 * ```typescript
 * const prismaProduct = await prisma.product.findUnique({
 *   where: { idProduct: 1 },
 *   include: { company: true, typeProduct: true },
 * })
 * const product = prismaProductToProduct(prismaProduct)
 * ```
 */
export function prismaProductToProduct(
	prisma: PrismaProductWithRelations
): Product {
	return {
		idProduct: prisma.idProduct,
		idCompany: prisma.idCompany,
		idTypeProduct: prisma.idTypeProduct,
		name: prisma.name,
		description: prisma.description,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(), // Date → string
		updatedAt: prisma.updatedAt.toISOString(), // Date → string
		company: {
			idCompany: prisma.company.idCompany,
			name: prisma.company.name,
		},
		typeProduct: prisma.typeProduct
			? {
					idTypeProduct: prisma.typeProduct.idTypeProduct,
					name: prisma.typeProduct.name,
				}
			: null,
	}
}

/**
 * Transforma una lista de Product de Prisma a Product[]
 */
export function prismaProductListToProducts(
	prismaList: PrismaProductWithRelations[]
): Product[] {
	return prismaList.map(prismaProductToProduct)
}
