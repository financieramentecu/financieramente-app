import { apiClient } from '@/lib/api/client'
import type {
	Company,
	CompanyFilters,
	CreateCompanyInput,
	UpdateCompanyInput,
} from '../types/company.types'

export const companyApi = {
	async getCompanies(filters?: CompanyFilters): Promise<Company[]> {
		const params = new URLSearchParams()
		if (filters?.search) params.set('search', filters.search)
		if (filters?.status) params.set('status', filters.status)

		const queryString = params.toString()
		const response = await apiClient.get<{ companies: Company[] }>(
			`/admin/companies${queryString ? `?${queryString}` : ''}`
		)
		return response.companies
	},

	async getCompany(id: number): Promise<Company> {
		const response = await apiClient.get<{ company: Company }>(
			`/admin/companies/${id}`
		)
		return response.company
	},

	async createCompany(data: CreateCompanyInput): Promise<Company> {
		const response = await apiClient.post<{ company: Company }>(
			'/admin/companies',
			data
		)
		return response.company
	},

	async updateCompany(id: number, data: UpdateCompanyInput): Promise<Company> {
		const response = await apiClient.put<{ company: Company }>(
			`/admin/companies/${id}`,
			data
		)
		return response.company
	},

	async deleteCompany(id: number): Promise<void> {
		await apiClient.delete(`/admin/companies/${id}`)
	},
}
