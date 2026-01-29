/**
 * User management types
 */

export interface UserRole {
	readonly id: number
	code: string
	name: string
}

export interface Category {
	readonly id: number
	name: string
}

export interface Leader {
	readonly id: number
	name: string
	lastName: string | null
}

export interface User {
	readonly id: number
	name: string
	lastName: string | null
	email: string | null
	avatar: string | null
	role: UserRole | null
	category: Category | null
	leader: Leader | null
	active: boolean
	readonly createdAt: Date
	lastLogin: Date | null
}

export interface UserFilters {
	status?: 'active' | 'inactive'
	role?: string
	search?: string
}

export interface UpdateUserInput {
	active?: boolean
	roleId?: number | null
	categoryId?: number | null
	leaderId?: number | null
}
