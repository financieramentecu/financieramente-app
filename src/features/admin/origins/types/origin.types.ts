/**
 * Tipos para el feature de Origins
 */

export interface ProductOrigin {
	idOrigin: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
}

export interface ClientOrigin {
	idClientOrigin: number
	name: string
	description: string | null
	status: boolean
	createdAt: string
	updatedAt: string
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
