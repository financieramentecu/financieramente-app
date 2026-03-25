import type { CategoryType as PrismaCategoryType } from '@prisma/client'
import type { CategoryType } from '../types/category-type.types'

/**
 * Normalizes a single CategoryType from Prisma to Domain
 */
export function prismaCategoryTypeToCategoryType(
    categoryType: PrismaCategoryType
): CategoryType {
    return {
        id: categoryType.id,
        name: categoryType.name,
        description: categoryType.description,
        status: categoryType.status,
        createdAt: categoryType.createdAt.toISOString(),
        updatedAt: categoryType.updatedAt.toISOString(),
    }
}

/**
 * Normalizes an array of CategoryTypes from Prisma to Domain
 */
export function prismaCategoryTypeListToCategoryTypes(
    categoryTypes: PrismaCategoryType[]
): CategoryType[] {
    return categoryTypes.map(prismaCategoryTypeToCategoryType)
}
