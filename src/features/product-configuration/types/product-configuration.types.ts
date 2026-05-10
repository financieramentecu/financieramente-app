/**
 * Types for the Product Configuration feature
 */

/**
 * Product Configuration interface (mapped from Prisma, not using Prisma types directly)
 */
export interface ProductConfiguration extends Record<string, unknown> {
	readonly id: number
	readonly idProduct: number
	readonly idLevel: number
	code: string
	active: boolean
	idProductPercentageCommissionNewBusinesses: number | null
	readonly createdAt: string
	readonly updatedAt: string
	product: {
		readonly idProduct: number
		name: string
		company: { readonly idCompany: number; name: string }
	}
	level: { readonly idLevel: number; name: string; code: string }
	ppcNewBusinesses: {
		readonly id: number
		description?: string | null
		active: boolean
	} | null
	/**
	 * Only present on **list** responses (`GET /api/product-configurations`).
	 * `true`  → no `ProductPercentageCommissionCategory` rows exist for any rule under this config (setup pending).
	 * `false` → at least one category line is saved (setup complete).
	 * `undefined` → not populated (e.g. detail endpoint `/by-code/[code]` or single-item responses).
	 */
	readonly distributionSetupIncomplete?: boolean
}

/**
 * Input for creating a new product configuration
 */
export interface CreateProductConfigurationInput {
	idCompany: number
	idProduct: number
	idLevel: number
}

/**
 * Input for updating an existing product configuration
 */
export interface UpdateProductConfigurationInput {
	idProductPercentageCommissionNewBusinesses: number
}

/**
 * Filters for product configuration search/listing
 */
export interface ProductConfigurationFilters {
	search?: string
	active?: string
}

/**
 * Response structure for product configuration list with pagination
 */
export interface ProductConfigurationListResponse {
	configurations: ProductConfiguration[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
