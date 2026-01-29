/**
 * Tipos para el feature de Periodicities
 */

export interface Periodicity extends Record<string, unknown> {
	readonly idBuyPeriodicity: number
	name: string
	active: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface PeriodicityFilters {
	search?: string
	status?: string
}

export interface CreatePeriodicityInput {
	name: string
	active: boolean
}

export interface UpdatePeriodicityInput {
	name?: string
	active?: boolean
}
