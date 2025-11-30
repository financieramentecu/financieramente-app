'use client'

import { useState, useEffect } from 'react'
import { userApi } from '../lib/user-api'
import type { User } from '../types/user.types'

export function useUser(id: number) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        loadUser()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const loadUser = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await userApi.getUser(id)
            setUser(data)
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            console.error('Error loading user:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return {
        user,
        isLoading,
        error,
        refreshUser: loadUser,
    }
}
