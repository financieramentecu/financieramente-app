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
	color: string | null
}

export interface Leader {
	readonly id: number
	name: string
	lastName: string | null
	email: string | null
}

export interface Level {
	readonly id: number
	code: string
	name: string
	color: string | null
	idNextLevel: number | null
}

export interface User {
	readonly id: number
	name: string
	lastName: string | null
	email: string | null
	avatar: string | null
	role: UserRole | null
	category: Category | null
	level: Level | null
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
	levelId?: number | null
	leaderId?: number | null
}
