import { apiClient } from '@/lib/api/client'
import type {
	Category,
	CategoryFilters,
	CreateCategoryInput,
	UpdateCategoryInput,
} from '../types/category.types'

export const categoryApi = {
	async getCategories(filters?: CategoryFilters): Promise<Category[]> {
		const params = new URLSearchParams()
		if (filters?.search) params.set('search', filters.search)
		if (filters?.type) params.set('type', filters.type)
		if (filters?.status) params.set('status', filters.status)

		const queryString = params.toString()
		const response = await apiClient.get<{ categories: Category[] }>(
			`/admin/categories${queryString ? `?${queryString}` : ''}`
		)
		return response.categories
	},

	async getCategory(id: number): Promise<Category> {
		const response = await apiClient.get<{ category: Category }>(
			`/admin/categories/${id}`
		)
		return response.category
	},

	async createCategory(data: CreateCategoryInput): Promise<Category> {
		const response = await apiClient.post<{ category: Category }>(
			'/admin/categories',
			data
		)
		return response.category
	},

	async updateCategory(
		id: number,
		data: UpdateCategoryInput
	): Promise<Category> {
		const response = await apiClient.put<{ category: Category }>(
			`/admin/categories/${id}`,
			data
		)
		return response.category
	},

	async deleteCategory(id: number): Promise<void> {
		await apiClient.delete(`/admin/categories/${id}`)
	},
}
