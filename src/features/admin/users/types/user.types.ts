/**
 * User management types
 */

export interface UserRole {
    id: number
    code: string
    name: string
}

export interface Category {
    id: number
    name: string
}

export interface Leader {
    id: number
    name: string
    lastName: string | null
}

export interface User {
    id: number
    name: string
    lastName: string | null
    email: string | null
    avatar: string | null
    role: UserRole | null
    category: Category | null
    leader: Leader | null
    active: boolean
    createdAt: Date
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
