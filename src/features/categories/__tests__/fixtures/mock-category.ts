import type {
	Category,
	CategoryListResponse,
	CategoryType,
} from '../../types/category.types'
import type { Category as PrismaCategory } from '@prisma/client'

/**
 * Creates a mock Category for tests
 */
export function createMockCategory(overrides?: Partial<Category>): Category {
	return {
		idCategory: 1,
		code: 'CAT001',
		name: 'Agente Experto',
		typeCategory: 'MMS',
		descripcion: 'Categoría para agentes expertos',
		status: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	}
}

/**
 * Creates a mock CategoryListResponse for tests
 */
export function createMockCategoryListResponse(
	categories: Category[] = [createMockCategory()],
	pagination?: Partial<CategoryListResponse['pagination']>
): CategoryListResponse {
	return {
		categories,
		pagination: {
			page: 1,
			pageSize: 10,
			total: categories.length,
			totalPages: Math.ceil(categories.length / 10),
			...pagination,
		},
	}
}

/**
 * Creates a mock Prisma Category for mapper tests
 */
export function createMockPrismaCategory(
	overrides?: Partial<PrismaCategory>
): PrismaCategory {
	return {
		idCategory: 1,
		code: 'CAT001',
		name: 'Agente Experto',
		typeCategory: 'MMS' as CategoryType,
		descripcion: 'Categoría para agentes expertos',
		status: true,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	}
}

/**
 * Creates multiple mock categories with different types
 */
export function createMockCategoriesByType(): Category[] {
	return [
		createMockCategory({
			idCategory: 1,
			code: 'MMS001',
			name: 'MMS Básico',
			typeCategory: 'MMS',
		}),
		createMockCategory({
			idCategory: 2,
			code: 'ALI001',
			name: 'Aliado Oro',
			typeCategory: 'ALIADO',
		}),
		createMockCategory({
			idCategory: 3,
			code: 'TRI001',
			name: 'Trinity Premium',
			typeCategory: 'TRINITY',
		}),
	]
}
