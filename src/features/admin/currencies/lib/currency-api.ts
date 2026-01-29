import { apiClient } from '@/lib/api/client'
import { prisma } from '@/lib/prisma'
import type { Currency as PrismaCurrency } from '@prisma/client'
import type {
	Currency,
	CurrencyFilters,
	CreateCurrencyInput,
	UpdateCurrencyInput,
} from '../types/currency.types'

/**
 * Server-side function to get active currencies.
 * Use this in Server Components and API Routes.
 * For Client Components, use currencyApi.getCurrencies() instead.
 */
export async function getCurrencies(): Promise<PrismaCurrency[]> {
	return await prisma.currency.findMany({
		where: {
			active: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}

export const currencyApi = {
	async getCurrencies(filters?: CurrencyFilters): Promise<Currency[]> {
		const params = new URLSearchParams()
		if (filters?.search) params.set('search', filters.search)
		if (filters?.status) params.set('status', filters.status)

		const queryString = params.toString()
		const response = await apiClient.get<{ currencies: Currency[] }>(
			`/admin/currencies${queryString ? `?${queryString}` : ''}`
		)
		return response.currencies
	},

	async getCurrency(id: number): Promise<Currency> {
		const response = await apiClient.get<{ currency: Currency }>(
			`/admin/currencies/${id}`
		)
		return response.currency
	},

	async createCurrency(data: CreateCurrencyInput): Promise<Currency> {
		const response = await apiClient.post<{ currency: Currency }>(
			'/admin/currencies',
			data
		)
		return response.currency
	},

	async updateCurrency(
		id: number,
		data: UpdateCurrencyInput
	): Promise<Currency> {
		const response = await apiClient.put<{ currency: Currency }>(
			`/admin/currencies/${id}`,
			data
		)
		return response.currency
	},

	async deleteCurrency(id: number): Promise<void> {
		await apiClient.delete(`/admin/currencies/${id}`)
	},
}
