import { Category, CategoryType } from '@prisma/client'
import { Category as CategoryDomain } from '../types/category.types'

/**
 * Mapea una categoría de Prisma a una categoría de dominio
 */
export const prismaCategoryToCategory = (
	prisma: Category & { categoryType?: CategoryType | null }
): CategoryDomain => {
	// Use type-safe approach to get type name, fallback to legacy field then default
	const typeCategory = prisma.categoryType?.name || (prisma as unknown as { typeCategory: string }).typeCategory || 'MMS'

	return {
		idCategory: prisma.idCategory,
		code: prisma.code,
		name: prisma.name,
		typeCategory,
		idCategoryType: prisma.idCategoryType || 1,
		descripcion: prisma.descripcion === null ? null : (prisma.descripcion || ''),
		status: prisma.status,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	}
}

/**
 * Mapea una lista de categorías de Prisma a categorías de dominio
 */
export const prismaCategoryListToCategories = (
	prismaList: (Category & { categoryType?: CategoryType | null })[]
): CategoryDomain[] => {
	return prismaList.map(prismaCategoryToCategory)
}

/**
 * Backwards compatibility alias
 */
export const mapToDomain = prismaCategoryToCategory
