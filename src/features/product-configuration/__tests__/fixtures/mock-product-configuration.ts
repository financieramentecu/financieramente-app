import type {
	ProductConfiguration,
	ProductConfigurationListResponse,
} from '../../types/product-configuration.types'

/**
 * Creates a mock ProductConfiguration for tests
 */
export function createMockProductConfiguration(
	overrides?: Partial<ProductConfiguration>
): ProductConfiguration {
	return {
		id: 1,
		idProduct: 1,
		idClientOrigin: 1,
		idCategory: 1,
		code: 'CREA_PATRIMONIO-PROPIO-JUNIOR',
		active: true,
		idProductPercentageCommissionNewBusinesses: 1,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		product: {
			idProduct: 1,
			name: 'Crea Patrimonio',
			company: { idCompany: 1, name: 'Empresa Test' },
		},
		clientOrigin: { idClientOrigin: 1, name: 'Propio' },
		category: { idCategory: 1, name: 'Junior' },
		ppcNewBusinesses: {
			id: 1,
			description: 'Distribución Estándar',
			active: true,
		},
		...overrides,
	}
}

/**
 * Creates a mock ProductConfigurationListResponse for tests
 */
export function createMockProductConfigurationListResponse(
	configurations: ProductConfiguration[] = [createMockProductConfiguration()],
	pagination?: Partial<ProductConfigurationListResponse['pagination']>
): ProductConfigurationListResponse {
	return {
		configurations,
		pagination: {
			page: 1,
			pageSize: 10,
			total: configurations.length,
			totalPages: Math.ceil(configurations.length / 10),
			...pagination,
		},
	}
}

/**
 * Creates a mock Prisma ProductConfiguration for mapper tests
 */
export function createMockPrismaProductConfiguration(
	overrides?: Record<string, unknown>
) {
	return {
		id: 1,
		idProduct: 1,
		idClientOrigin: 1,
		idCategory: 1,
		code: 'CREA_PATRIMONIO-PROPIO-JUNIOR',
		active: true,
		idProductPercentageCommissionNewBusinesses: 1,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		product: {
			idProduct: 1,
			name: 'Crea Patrimonio',
			company: { idCompany: 1, name: 'Empresa Test' },
		},
		clientOrigin: { idClientOrigin: 1, name: 'Propio' },
		category: { idCategory: 1, name: 'Junior' },
		productPercentageCommissionNewBusinesses: {
			idProductPercentageCommission: 1,
			description: 'Distribución Estándar',
			active: true,
		},
		productPercentageCommissions: [
			{
				idProductPercentageCommission: 1,
				description: 'Distribución Estándar',
				active: true,
			},
		],
		...overrides,
	}
}
