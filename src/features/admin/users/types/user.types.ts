/**
 * User management types
 */

export interface UserRole {
    id: number
    code: string
    name: string
}

export interface User {
    id: number
    name: string
    lastName: string | null
    email: string | null
    avatar: string | null
    role: UserRole | null
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
}
