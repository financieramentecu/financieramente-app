import { apiClient } from '@/lib/api/client'
import type {
	Product,
	ProductFilters,
	CreateProductInput,
	UpdateProductInput,
	CompanyOption,
} from '../types/product.types'

export const productApi = {
	async getProducts(filters?: ProductFilters): Promise<Product[]> {
		const params = new URLSearchParams()
		if (filters?.search) params.set('search', filters.search)
		if (filters?.companyId && filters.companyId !== 'all') {
			params.set('companyId', filters.companyId)
		}

		const queryString = params.toString()
		const response = await apiClient.get<{ products: Product[] }>(
			`/admin/products${queryString ? `?${queryString}` : ''}`
		)
		return response.products
	},

	async getProduct(id: number): Promise<Product> {
		const response = await apiClient.get<{ product: Product }>(
			`/admin/products/${id}`
		)
		return response.product
	},

	async createProduct(data: CreateProductInput): Promise<Product> {
		const response = await apiClient.post<{ product: Product }>(
			'/admin/products',
			data
		)
		return response.product
	},

	async updateProduct(id: number, data: UpdateProductInput): Promise<Product> {
		const response = await apiClient.put<{ product: Product }>(
			`/admin/products/${id}`,
			data
		)
		return response.product
	},

	async deleteProduct(id: number): Promise<void> {
		await apiClient.delete(`/admin/products/${id}`)
	},

	async getActiveCompanies(): Promise<CompanyOption[]> {
		const response = await apiClient.get<{ companies: CompanyOption[] }>(
			'/admin/companies?status=active'
		)
		return response.companies
	},
}
