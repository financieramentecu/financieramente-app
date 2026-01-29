import { apiClient } from '@/lib/api/client'
import { prisma } from '@/lib/prisma'
import type { ClientOrigin as PrismaClientOrigin } from '@prisma/client'
import type {
	ProductOrigin,
	ClientOrigin,
	CreateProductOriginInput,
	UpdateProductOriginInput,
	CreateClientOriginInput,
	UpdateClientOriginInput,
} from '../types/origin.types'

/**
 * Server-side function to get active client origins.
 * Use this in Server Components and API Routes.
 * For Client Components, use originApi.getClientOrigins() instead.
 */
export async function getClientOrigins(): Promise<PrismaClientOrigin[]> {
	return await prisma.clientOrigin.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}

export const originApi = {
	// Product Origins
	async getProductOrigins(): Promise<ProductOrigin[]> {
		const response = await apiClient.get<{ origins: ProductOrigin[] }>(
			'/admin/product-origins'
		)
		return response.origins
	},

	async createProductOrigin(
		data: CreateProductOriginInput
	): Promise<ProductOrigin> {
		const response = await apiClient.post<{ origin: ProductOrigin }>(
			'/admin/product-origins',
			data
		)
		return response.origin
	},

	async updateProductOrigin(
		id: number,
		data: UpdateProductOriginInput
	): Promise<ProductOrigin> {
		const response = await apiClient.put<{ origin: ProductOrigin }>(
			`/admin/product-origins/${id}`,
			data
		)
		return response.origin
	},

	async deleteProductOrigin(id: number): Promise<void> {
		await apiClient.delete(`/admin/product-origins/${id}`)
	},

	// Client Origins
	async getClientOrigins(): Promise<ClientOrigin[]> {
		const response = await apiClient.get<{ origins: ClientOrigin[] }>(
			'/admin/client-origins'
		)
		return response.origins
	},

	async createClientOrigin(
		data: CreateClientOriginInput
	): Promise<ClientOrigin> {
		const response = await apiClient.post<{ origin: ClientOrigin }>(
			'/admin/client-origins',
			data
		)
		return response.origin
	},

	async updateClientOrigin(
		id: number,
		data: UpdateClientOriginInput
	): Promise<ClientOrigin> {
		const response = await apiClient.put<{ origin: ClientOrigin }>(
			`/admin/client-origins/${id}`,
			data
		)
		return response.origin
	},

	async deleteClientOrigin(id: number): Promise<void> {
		await apiClient.delete(`/admin/client-origins/${id}`)
	},
}
