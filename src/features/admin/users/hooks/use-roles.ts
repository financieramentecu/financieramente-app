import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'

interface Role {
    id: number
    code: string
    name: string
}

/**
 * Hook para cargar y cachear los roles disponibles
 * Evita cargar los roles múltiples veces
 *
 * @returns {roles, isLoading, error, refreshRoles}
 */
export function useRoles() {
    const [roles, setRoles] = useState<Role[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        loadRoles()
    }, [])

    const loadRoles = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await apiClient.get<{
                success: boolean
                data: Role[]
            }>('/admin/roles')
            setRoles(response.data)
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Error desconocido')
            setError(error)
            console.error('Error loading roles:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return {
        roles,
        isLoading,
        error,
        refreshRoles: loadRoles,
    }
}
