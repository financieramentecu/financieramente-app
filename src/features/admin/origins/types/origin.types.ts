/**
 * Tipos para el feature de Origins
 */

export interface ProductOrigin {
	readonly idOrigin: number
	name: string
	description: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface ClientOrigin {
	readonly idClientOrigin: number
	name: string
	description: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
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
	status: boolean
}

export interface UpdateClientOriginInput {
	name?: string
	description?: string
	status?: boolean
}
