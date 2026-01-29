/**
 * Tipos para el feature de Currencies
 */

export interface Currency extends Record<string, unknown> {
	readonly idCurrency: number
	name: string
	symbol: string | null
	active: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface CurrencyFilters {
	search?: string
	status?: string
}

export interface CreateCurrencyInput {
	name: string
	symbol?: string
	active: boolean
}

export interface UpdateCurrencyInput {
	name?: string
	symbol?: string
	active?: boolean
}
