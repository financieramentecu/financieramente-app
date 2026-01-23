'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { UserRole } from '@/lib/auth/roles'

export interface Leader {
	id: number
	name: string
	lastName: string | null
	email: string | null
}

/**
 * Hook para cargar usuarios que pueden ser líderes (coaches)
 * Solo incluye usuarios con rol AGENTE que están activos
 * Excluye el usuario actual si se proporciona
 *
 * @param excludeUserId - ID del usuario a excluir de la lista (opcional)
 * @returns {leaders, isLoading, error, refreshLeaders}
 */
export function useLeaders(
	excludeUserId?: number
): {
	leaders: Leader[]
	isLoading: boolean
	error: Error | null
	refreshLeaders: () => Promise<void>
} {
	const [leaders, setLeaders] = useState<Leader[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		loadLeaders()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [excludeUserId])

	const loadLeaders = async () => {
		try {
			setIsLoading(true)
			setError(null)
			const response = await apiClient.get<{
				success: boolean
				data: Array<{
					id: number
					name: string
					lastName: string | null
					email: string | null
					role: { code: string; name: string } | null
					active: boolean
				}>
			}>(`/admin/users?role=${UserRole.AGENTE}&status=active`)

			// Verificar que la respuesta tenga la estructura correcta
			if (!response.success || !Array.isArray(response.data)) {
				console.error('Respuesta inesperada de la API:', response)
				setError(new Error('Formato de respuesta inválido'))
				return
			}

			// Filtrar usuarios activos con rol AGENTE y excluir el usuario actual
			const filteredLeaders = response.data
				.filter(
					(user) =>
						user.role?.code === UserRole.AGENTE &&
						user.active &&
						(!excludeUserId || user.id !== excludeUserId)
				)
				.map((user) => {
					// Asegurarse de que name y lastName sean strings válidos
					// No usar el nombre del rol, usar el nombre del usuario
					const name = typeof user.name === 'string' ? user.name.trim() : ''
					const lastName =
						typeof user.lastName === 'string' && user.lastName.trim()
							? user.lastName.trim()
							: null

					// Validar que el nombre no sea el nombre del rol
					if (
						!name ||
						name.toLowerCase() === 'coach' ||
						name.toLowerCase() === 'agente/coach'
					) {
						console.warn(
							`Usuario con nombre inválido o nombre de rol: ${name}`,
							user
						)
					}

					return {
						id: user.id,
						name: name,
						lastName: lastName,
						email: user.email || null,
					}
				})
				.filter((leader) => {
					// Filtrar líderes sin nombre válido o con nombre que sea el nombre del rol
					return (
						leader.name.length > 0 &&
						leader.name.toLowerCase() !== 'coach' &&
						leader.name.toLowerCase() !== 'agente/coach'
					)
				})

			// Ordenar por nombre para facilitar la visualización
			const sortedLeaders = filteredLeaders.sort((a, b) => {
				const nameA = `${a.name} ${a.lastName || ''}`.trim().toLowerCase()
				const nameB = `${b.name} ${b.lastName || ''}`.trim().toLowerCase()
				return nameA.localeCompare(nameB)
			})

			setLeaders(sortedLeaders)
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Error desconocido')
			setError(error)
			console.error('Error loading leaders:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		leaders,
		isLoading,
		error,
		refreshLeaders: loadLeaders,
	}
}
