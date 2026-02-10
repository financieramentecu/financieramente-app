/**
 * Types for the Product Configuration feature
 */

/**
 * Product Configuration interface (mapped from Prisma, not using Prisma types directly)
 */
export interface ProductConfiguration extends Record<string, unknown> {
	readonly id: number
	readonly idProduct: number
	readonly idClientOrigin: number
	readonly idCategory: number
	code: string
	active: boolean
	idProductPercentajeCommisionNewBusinesses: number | null
	readonly createdAt: string
	readonly updatedAt: string
	product: {
		readonly idProduct: number
		name: string
		company: { readonly idCompany: number; name: string }
	}
	clientOrigin: { readonly idClientOrigin: number; name: string }
	category: { readonly idCategory: number; name: string }
	ppcNewBusinesses: { readonly id: number; active: boolean } | null
}

/**
 * Input for creating a new product configuration
 */
export interface CreateProductConfigurationInput {
	idCompany: number
	idProduct: number
	idClientOrigin: number
	idCategory: number
}

/**
 * Input for updating an existing product configuration
 */
export interface UpdateProductConfigurationInput {
	idProductPercentajeCommisionNewBusinesses: number
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
