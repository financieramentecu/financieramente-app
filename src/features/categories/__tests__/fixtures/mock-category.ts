import type { Category } from '../../types/category.types'
import type { PrismaCategoryWithRelations as MapperPrismaCategoryWithRelations } from '../../mappers/category.mapper'

/**
 * Mock category for testing (Domain Type — new simple model)
 */
export const MOCK_CATEGORY: Category = {
	id: 1,
	name: 'Categoría de Prueba',
	description: 'Esta es una categoría de prueba para tests',
	status: true,
	idCategoryType: 1,
	categoryType: { name: 'Tipo A' },
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

export const createMockCategory = (
	overrides: Partial<Category> = {}
): Category => ({
	...MOCK_CATEGORY,
	...overrides,
})

export const createMockCategoryListResponse = (
	categories = [MOCK_CATEGORY]
) => ({
	categories,
	pagination: {
		total: categories.length,
		page: 1,
		pageSize: 10,
		totalPages: 1,
	},
})

export const createMockCategoriesByStatus = (
	status: boolean = true,
	count = 3
) => {
	return Array.from({ length: count }, (_, i) => ({
		...MOCK_CATEGORY,
		id: i + 1,
		name: `Categoría ${i + 1}`,
		status,
	}))
}

/**
 * Mock Prisma Category for testing (Prisma Client Type)
 * Uses the exported type from the mapper to ensure compatibility
 */
export const createMockPrismaCategory = (
	overrides: Partial<MapperPrismaCategoryWithRelations> = {}
): MapperPrismaCategoryWithRelations => {
	const now = new Date()
	const base: MapperPrismaCategoryWithRelations = {
		id: 1,
		name: 'Categoría 1',
		description: 'Descripción 1',
		status: true,
		idCategoryType: 1,
		createdAt: now,
		updatedAt: now,
	}
	return {
		...base,
		...overrides as MapperPrismaCategoryWithRelations,
	}
}
