/**
 * Tipos para el feature de Products
 */

export interface Product extends Record<string, unknown> {
	idProduct: number
	idCompany: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
	company: {
		idCompany: number
		name: string
	}
}

export interface ProductFilters {
	search?: string
	status?: string
	idCompany?: number
}

export interface CreateProductInput {
	name: string
	idCompany: number
	status: boolean
}

export interface UpdateProductInput {
	name?: string
	idCompany?: number
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
	idCompany: number
	name: string
	status: boolean
}
