'use client'

import { useState, useEffect } from 'react'
import { userApi } from '../lib/user-api'
import type { User, UserFilters } from '../types/user.types'

export function useUsers(filters?: UserFilters) {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        loadUsers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters?.search, filters?.status, filters?.role])

    const loadUsers = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await userApi.getUsers(filters)
            setUsers(data)
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            console.error('Error loading users:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return {
        users,
        isLoading,
        error,
        refreshUsers: loadUsers,
    }
}
