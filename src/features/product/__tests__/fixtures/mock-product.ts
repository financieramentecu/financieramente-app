import type {
	Product,
	ProductListResponse,
	CompanyOption,
} from '../../types/product.types'
import { Prisma } from '@prisma/client'

/**
 * Crea un mock de Product para tests
 */
export function createMockProduct(overrides?: Partial<Product>): Product {
	return {
		idProduct: 1,
		idCompany: 1,
		idTypeProduct: null,
		name: 'Seguro de Vida',
		description: 'Seguro de vida completo',
		status: true,
		commissionPercentage: 0,
		contributionType: 'REGULAR',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		company: {
			idCompany: 1,
			name: 'Skandia',
		},
		typeProduct: null,
		...overrides,
	}
}

/**
 * Crea un mock de ProductListResponse para tests
 */
export function createMockProductListResponse(
	products: Product[] = [createMockProduct()],
	pagination?: Partial<ProductListResponse['pagination']>
): ProductListResponse {
	return {
		products,
		pagination: {
			page: 1,
			pageSize: 10,
			total: products.length,
			totalPages: Math.ceil(products.length / 10),
			...pagination,
		},
	}
}

/**
 * Crea un mock de CompanyOption para tests
 */
export function createMockCompanyOption(
	overrides?: Partial<CompanyOption>
): CompanyOption {
	return {
		idCompany: 1,
		name: 'Skandia',
		status: true,
		...overrides,
	}
}

/**
 * Crea un mock de PrismaProductWithCompany para tests de mapper
 */
export function createMockPrismaProduct(
	overrides?: Partial<Prisma.ProductGetPayload<{ include: { company: true; typeProduct: true } }>>
): Prisma.ProductGetPayload<{ include: { company: true; typeProduct: true } }> {
	return {
		idProduct: 1,
		idCompany: 1,
		idTypeProduct: null,
		name: 'Seguro de Vida',
		description: 'Seguro de vida completo',
		status: true,
		commissionPercentage: new Prisma.Decimal(0),
		contributionType: 'REGULAR',
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		company: {
			idCompany: 1,
			name: 'Skandia',
			idTypeCompany: 'NACIONAL',
			idCurrency: 1,
			status: true,
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		},
		typeProduct: null,
		...overrides,
	}

}
