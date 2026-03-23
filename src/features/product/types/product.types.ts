/**
 * Tipos para el feature de Products
 */

export interface Product extends Record<string, unknown> {
	readonly idProduct: number
	readonly idCompany: number
	readonly idTypeProduct: number | null
	name: string
	description: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
	company: {
		readonly idCompany: number
		name: string
	}
	typeProduct: {
		readonly idTypeProduct: number
		name: string
	} | null
}

export interface ProductFilters {
	search?: string
	status?: string
	idCompany?: number
	companyId?: string // Alias for admin compatibility
}

export interface CreateProductInput {
	name: string
	idCompany: number
	idTypeProduct?: number
	description?: string
	status: boolean
}

export interface UpdateProductInput {
	name?: string
	idCompany?: number
	idTypeProduct?: number
	description?: string
	status?: boolean
}

export interface ProductListResponse {
	products: Product[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export interface CompanyOption {
	readonly idCompany: number
	name: string
	status: boolean
}
