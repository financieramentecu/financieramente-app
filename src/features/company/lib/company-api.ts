import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	Company,
	CompanyFilters,
	CreateCompanyInput,
	UpdateCompanyInput,
	CompanyListResponse,
} from '../types/company.types'

/**
 * API client for companies
 * Returns ApiResponse<T> following project standards
 */
export const companyApi = {
	/**
	 * Gets the list of companies with pagination and search
	 */
	async getCompanies(
		params?: CompanyFilters & { page?: number; pageSize?: number }
	): Promise<ApiResponse<CompanyListResponse>> {
		try {
			const queryParams = new URLSearchParams()
			if (params?.search) queryParams.set('search', params.search)
			if (params?.status) queryParams.set('status', params.status)
			if (params?.page) queryParams.set('page', params.page.toString())
			if (params?.pageSize)
				queryParams.set('pageSize', params.pageSize.toString())

			const queryString = queryParams.toString()
			const data = await apiClient.get<ApiResponse<CompanyListResponse>>(
				`/admin/companies${queryString ? `?${queryString}` : ''}`
			)

			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresas',
			}
		}
	},

	/**
	 * Gets a company by ID
	 */
	async getCompany(id: number): Promise<ApiResponse<Company>> {
		try {
			const data = await apiClient.get<ApiResponse<Company>>(
				`/admin/companies/${id}`
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener empresa',
			}
		}
	},

	/**
	 * Creates a new company
	 */
	async createCompany(
		input: CreateCompanyInput
	): Promise<ApiResponse<Company>> {
		try {
			const data = await apiClient.post<ApiResponse<Company>>(
				'/admin/companies',
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear empresa',
			}
		}
	},

	/**
	 * Updates an existing company
	 */
	async updateCompany(
		id: number,
		input: UpdateCompanyInput
	): Promise<ApiResponse<Company>> {
		try {
			const data = await apiClient.put<ApiResponse<Company>>(
				`/admin/companies/${id}`,
				input
			)
			return data
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar empresa',
			}
		}
	},

	/**
	 * Deletes a company
	 */
	async deleteCompany(id: number): Promise<ApiResponse<void>> {
		try {
			await apiClient.delete(`/admin/companies/${id}`)
			return { data: undefined }
		} catch (error) {
			return {
				data: null,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar empresa',
			}
		}
	},
}
