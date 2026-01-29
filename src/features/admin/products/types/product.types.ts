/**
 * Tipos para el feature de Products
 */

export interface Product extends Record<string, unknown> {
	readonly idProduct: number
	name: string
	description: string | null
	status: boolean
	readonly idCompany: number
	readonly idTypeProduct: number | null
	company: {
		readonly idCompany: number
		name: string
	}
	typeProduct: {
		readonly idTypeProduct: number
		name: string
	} | null
	readonly createdAt: string
	readonly updatedAt: string
}

export interface CompanyOption {
	readonly idCompany: number
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
