/**
 * Tipos para el feature de Client Origin
 */

export interface ClientOrigin extends Record<string, unknown> {
	idClientOrigin: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
}

export interface ClientOriginFilters {
	search?: string
	status?: 'active' | 'inactive'
}

export interface CreateClientOriginInput {
	name: string
	description?: string
	status?: boolean
}

export interface UpdateClientOriginInput {
	name?: string
	description?: string
	status?: boolean
}

export interface ClientOriginListResponse {
	origins: ClientOrigin[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}
