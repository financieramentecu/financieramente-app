import { Category as PrismaCategory } from '@prisma/client'
import { Category as CategoryDomain } from '../types/category.types'

export type PrismaCategoryWithRelations = Omit<PrismaCategory, never> & {
	categoryType?: { name: string } | null
}

/**
 * Maps a Prisma Category to a domain Category
 */
export const prismaCategoryToCategory = (
	prisma: PrismaCategoryWithRelations
): CategoryDomain => {
	return {
		id: prisma.id,
		name: prisma.name,
		description: prisma.description ?? null,
		status: prisma.status,
		idCategoryType: prisma.idCategoryType,
		categoryType: prisma.categoryType
			? { name: prisma.categoryType.name }
			: undefined,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	}
}

/**
 * Maps a list of Prisma Categories to domain Categories
 */
export const prismaCategoryListToCategories = (
	prismaList: PrismaCategoryWithRelations[]
): CategoryDomain[] => {
	return prismaList.map(prismaCategoryToCategory)
}

/**
 * Backwards compatibility alias
 */
export const mapToDomain = prismaCategoryToCategory
