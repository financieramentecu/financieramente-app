/**
 * Tipos para el feature de Companies
 */

export interface Company extends Record<string, unknown> {
	readonly idCompany: number
	name: string
	idTypeCompany: string
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface CompanyFilters {
	search?: string
	status?: string
}

export interface CreateCompanyInput {
	name: string
	idTypeCompany: 'NACIONAL' | 'INTERNACIONAL'
	status: boolean
}

export interface UpdateCompanyInput {
	name?: string
	idTypeCompany?: 'NACIONAL' | 'INTERNACIONAL'
	status?: boolean
}
