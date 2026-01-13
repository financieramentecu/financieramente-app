/**
 * Mapper para transformar Product de Prisma a Product type
 * Responsabilidad única: conversión de datos de base de datos a dominio
 */

import type { Product } from '../types/product.types'
import type { Prisma } from '@prisma/client'

type PrismaProductWithCompany = Prisma.ProductGetPayload<{
	include: {
		company: true
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
 *   include: { company: true },
 * })
 * const product = prismaProductToProduct(prismaProduct)
 * ```
 */
export function prismaProductToProduct(
	prisma: PrismaProductWithCompany
): Product {
	return {
		idProduct: prisma.idProduct,
		idCompany: prisma.idCompany,
		name: prisma.name,
		description: prisma.description,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(), // Date → string
		updatedAt: prisma.updatedAt.toISOString(), // Date → string
		company: {
			idCompany: prisma.company.idCompany,
			name: prisma.company.name,
		},
	}
}

/**
 * Transforma una lista de Product de Prisma a Product[]
 */
export function prismaProductListToProducts(
	prismaList: PrismaProductWithCompany[]
): Product[] {
	return prismaList.map(prismaProductToProduct)
}
