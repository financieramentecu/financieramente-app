/**
 * Mapper for transforming Category from Prisma to Category type
 * Single responsibility: database data conversion to domain
 */

import type { Category, CategoryType } from '../types/category.types'
import type { Category as PrismaCategory } from '@prisma/client'

/**
 * Transforms a Prisma Category to Category type
 *
 * @param prisma - Category from Prisma
 * @returns Category for use in the UI
 *
 * @example
 * ```typescript
 * const prismaCategory = await prisma.category.findUnique({
 *   where: { idCategory: 1 },
 * })
 * const category = prismaCategoryToCategory(prismaCategory)
 * ```
 */
export function prismaCategoryToCategory(prisma: PrismaCategory): Category {
	return {
		idCategory: prisma.idCategory,
		code: prisma.code,
		name: prisma.name,
		typeCategory: prisma.typeCategory as CategoryType,
		descripcion: prisma.descripcion,
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	}
}

/**
 * Transforms a list of Prisma Categories to Category[]
 */
export function prismaCategoryListToCategories(
	prismaList: PrismaCategory[]
): Category[] {
	return prismaList.map(prismaCategoryToCategory)
}
