import { apiClient } from '@/lib/api/client'
import type {
	Periodicity,
	PeriodicityFilters,
	CreatePeriodicityInput,
	UpdatePeriodicityInput,
} from '../types/periodicity.types'

export const periodicityApi = {
	async getPeriodicities(filters?: PeriodicityFilters): Promise<Periodicity[]> {
		const params = new URLSearchParams()
		if (filters?.search) params.set('search', filters.search)
		if (filters?.status) params.set('status', filters.status)

		const queryString = params.toString()
		const response = await apiClient.get<{ periodicities: Periodicity[] }>(
			`/admin/periodicities${queryString ? `?${queryString}` : ''}`
		)
		return response.periodicities
	},

	async getPeriodicity(id: number): Promise<Periodicity> {
		const response = await apiClient.get<{ periodicity: Periodicity }>(
			`/admin/periodicities/${id}`
		)
		return response.periodicity
	},

	async createPeriodicity(data: CreatePeriodicityInput): Promise<Periodicity> {
		const response = await apiClient.post<{ periodicity: Periodicity }>(
			'/admin/periodicities',
			data
		)
		return response.periodicity
	},

	async updatePeriodicity(
		id: number,
		data: UpdatePeriodicityInput
	): Promise<Periodicity> {
		const response = await apiClient.put<{ periodicity: Periodicity }>(
			`/admin/periodicities/${id}`,
			data
		)
		return response.periodicity
	},

	async deletePeriodicity(id: number): Promise<void> {
		await apiClient.delete(`/admin/periodicities/${id}`)
	},
}
