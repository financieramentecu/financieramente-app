/**
 * Tipos para el feature de Products
 */

export interface Product extends Record<string, unknown> {
	idProduct: number
	name: string
	description: string | null
	status: boolean
	idCompany: number
	idTypeProduct: number | null
	company: {
		idCompany: number
		name: string
	}
	typeProduct: {
		idTypeProduct: number
		name: string
	} | null
	createdAt: string
	updatedAt: string
}

export interface CompanyOption {
	idCompany: number
	name: string
	status: boolean
}

export interface ProductFilters {
	search?: string
	companyId?: string
}

export interface CreateProductInput {
	name: string
	description?: string
	idCompany: number
	idTypeProduct?: number
	status: boolean
}

export interface UpdateProductInput {
	name?: string
	description?: string
	idCompany?: number
	idTypeProduct?: number
	status?: boolean
}
