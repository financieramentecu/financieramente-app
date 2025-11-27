import { apiClient } from '@/lib/api/client'
import type { User, UserFilters, UpdateUserInput } from '../types/user.types'
import { buildUserFiltersParams } from '../utils/filter.utils'

export const userApi = {
    async getUsers(filters?: UserFilters): Promise<User[]> {
        const params = buildUserFiltersParams(filters || {})
        const queryString = params.toString()
        const response = await apiClient.get<{ success: boolean; data: User[] }>(
            `/admin/users${queryString ? `?${queryString}` : ''}`
        )
        return response.data
    },

    async getUser(id: number): Promise<User> {
        const response = await apiClient.get<{ success: boolean; data: User }>(
            `/admin/users/${id}`
        )
        return response.data
    },

    async updateUser(id: number, data: UpdateUserInput): Promise<User> {
        const response = await apiClient.put<{
            success: boolean
            data: User
            message: string
        }>(`/admin/users/${id}`, data)
        return response.data
    },
}
