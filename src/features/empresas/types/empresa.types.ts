/**
 * Tipos para el feature de Empresas/Agencias
 */

export interface Empresa extends Record<string, unknown> {
	readonly idCompany: number
	name: string
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface EmpresaFilters {
	search?: string
	status?: string
}

export interface CreateEmpresaInput {
	name: string
	status: boolean
}

export interface UpdateEmpresaInput {
	name?: string
	status?: boolean
}

export interface EmpresaListResponse {
	empresas: Empresa[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
