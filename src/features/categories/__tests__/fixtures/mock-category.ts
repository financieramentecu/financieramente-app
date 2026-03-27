import { CategoryType as CategoryTypeDomain } from '../../types/category.types'
import { BeneficiaryMode, Category, CategoryType } from '@prisma/client'

/**
 * Mock category for testing (Domain Type)
 */
export const MOCK_CATEGORY = {
	idCategory: 1,
	code: 'CAT-001',
	name: 'Categoría de Prueba',
	idCategoryType: 1,
	typeCategory: 'MMS' as CategoryTypeDomain,
	descripcion: 'Esta es una categoría de prueba para tests',
	status: true,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
}

export const createMockCategory = (overrides: Partial<typeof MOCK_CATEGORY> = {}) => ({
	...MOCK_CATEGORY,
	...overrides,
})

export const createMockCategoryListResponse = (categories = [MOCK_CATEGORY]) => ({
	categories,
	pagination: {
		total: categories.length,
		page: 1,
		pageSize: 10,
		totalPages: 1,
	},
})

export const createMockCategoriesByType = (type: CategoryTypeDomain = 'MMS', count = 3) => {
	return Array.from({ length: count }, (_, i) => ({
		...MOCK_CATEGORY,
		idCategory: i + 1,
		code: `CAT-${type}-${i + 1}`,
		typeCategory: type,
	}))
}

/**
 * Mock Prisma Category for testing (Prisma Client Type)
 */
export const createMockPrismaCategory = (overrides: Partial<Category & { categoryType?: CategoryType | null }> = {}): Category & { categoryType?: CategoryType | null } => {
	const now = new Date()
	return {
		idCategory: 1,
		code: 'CAT-001',
		name: 'Categoría 1',
		idCategoryType: 1,
		descripcion: 'Descripción 1',
		status: true,
		beneficiaryMode: BeneficiaryMode.UPLINE_CHAIN,
		idFixedBeneficiaryUser: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	}
}
