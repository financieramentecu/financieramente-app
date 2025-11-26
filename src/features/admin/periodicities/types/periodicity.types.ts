/**
 * Tipos para el feature de Periodicities
 */

export interface Periodicity extends Record<string, unknown> {
	idBuyPeriodicity: number
	name: string
	active: boolean
	createdAt: string
	updatedAt: string
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
