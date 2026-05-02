import type { Company, CompanyListResponse } from '../../types/company.types'
import type { Company as PrismaCompany } from '@prisma/client'

/**
 * Creates a mock Company for tests
 */
export function createMockCompany(overrides?: Partial<Company>): Company {
	return {
		idCompany: 1,
		name: 'Skandia Seguros',
		idCurrency: 1,
		status: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	}
}

/**
 * Creates a mock CompanyListResponse for tests
 */
export function createMockCompanyListResponse(
	companies: Company[] = [createMockCompany()],
	pagination?: Partial<CompanyListResponse['pagination']>
): CompanyListResponse {
	return {
		companies,
		pagination: {
			page: 1,
			pageSize: 10,
			total: companies.length,
			totalPages: Math.ceil(companies.length / 10),
			...pagination,
		},
	}
}

/**
 * Creates a mock Prisma Company for mapper tests
 */
export function createMockPrismaCompany(
	overrides?: Partial<PrismaCompany>
): PrismaCompany {
	return {
		idCompany: 1,
		name: 'Skandia Seguros',
		idTypeCompany: 'NACIONAL',
		idCurrency: 1,
		status: true,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z',),
		...overrides,
	}
}
