/**
 * Common types for the Origins feature (covers both Product and Client origins)
 */

export interface ProductOrigin extends Record<string, unknown> {
	readonly idOrigin: number
	name: string
	description: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface ClientOrigin extends Record<string, unknown> {
	readonly idClientOrigin: number
	name: string
	description: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface ProductOriginFilters {
	search?: string
	status?: string
}

export interface ClientOriginFilters {
	search?: string
	status?: 'active' | 'inactive' | string
}

export interface CreateProductOriginInput {
	name: string
	description?: string
	status: boolean
}

export interface UpdateProductOriginInput {
	name?: string
	description?: string
	status?: boolean
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
