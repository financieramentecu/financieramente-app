import type { Category } from '../../types/category.types'
import { CategoryType as CategoryTypeDomain } from '../../types/category.types'
import { PrismaCategoryWithRelations as MapperPrismaCategoryWithRelations } from '../../mappers/category.mapper'

export enum BeneficiaryMode {
	OVERRIDE = 'OVERRIDE',
	BENEFICIARIO_GENERAL = 'BENEFICIARIO_GENERAL',
}

/**
 * Mock category for testing (Domain Type)
 */
export const MOCK_CATEGORY: Category = {
	idCategory: 1,
	code: 'CAT-001',
	name: 'Categoría de Prueba',
	idCategoryType: 1,
	typeCategory: 'MMS',
	descripcion: 'Esta es una categoría de prueba para tests',
	color: '#1A73E8',
	status: true,
	beneficiaryMode: 'OVERRIDE',
	idFixedBeneficiaryUser: null,
	fixedBeneficiaryUser: null,
	idNextCategory: null,
	nextCategory: null,
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

export const createMockCategoriesByType = (
	type: CategoryTypeDomain = 'MMS',
	count = 3
) => {
	return Array.from({ length: count }, (_, i) => ({
		...MOCK_CATEGORY,
		idCategory: i + 1,
		code: `CAT-${type}-${i + 1}`,
		typeCategory: type,
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
		idCategory: 1,
		code: 'CAT-001',
		name: 'Categoría 1',
		idCategoryType: 1,
		descripcion: 'Descripción 1',
		color: '#1A73E8',
		status: true,
		beneficiaryMode: 'OVERRIDE',
		idFixedBeneficiaryUser: null,
		idNextCategory: null,
		createdAt: now,
		updatedAt: now,
	}
	return {
		...base,
		...overrides as MapperPrismaCategoryWithRelations,
	}
}
