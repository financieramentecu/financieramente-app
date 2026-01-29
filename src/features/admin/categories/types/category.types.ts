/**
 * Tipos para el feature de Categories
 */

export interface Category extends Record<string, unknown> {
	readonly idCategory: number
	code: string
	name: string
	typeCategory: 'MMS' | 'ALIADO' | 'TRINITY'
	descripcion: string | null
	status: boolean
	readonly createdAt: string
	readonly updatedAt: string
}

export interface CategoryFilters {
	search?: string
	type?: string
	status?: string
}

export interface CreateCategoryInput {
	code: string
	name: string
	typeCategory: 'MMS' | 'ALIADO' | 'TRINITY'
	descripcion?: string
	status: boolean
}

export interface UpdateCategoryInput {
	code?: string
	name?: string
	typeCategory?: 'MMS' | 'ALIADO' | 'TRINITY'
	descripcion?: string
	status?: boolean
}
