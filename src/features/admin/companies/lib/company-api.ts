import { apiClient } from '@/lib/api/client'
import { prisma } from '@/lib/prisma'
import type { Company as PrismaCompany } from '@prisma/client'
import type {
	Company,
	CompanyFilters,
	CreateCompanyInput,
	UpdateCompanyInput,
} from '../types/company.types'

/**
 * Server-side function to get active companies.
 * Use this in Server Components and API Routes.
 * For Client Components, use companyApi.getCompanies() instead.
 */
export async function getCompanies(): Promise<PrismaCompany[]> {
	return await prisma.company.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}

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
