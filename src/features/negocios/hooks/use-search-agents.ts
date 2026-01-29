import { ApiResponse } from '@/features/shared/types/api-response.types'
import { AsyncState } from '@/features/shared/types/async-state.types'
import { UserRole } from '@/features/auth/lib/roles'
import React, { useState } from 'react'
import { UserWithRole } from '../types/business.types'
export const useSearchAgents = () => {
	const [search, setSearch] = useState('')
	const [state, setState] = useState<AsyncState<UserWithRole[]>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const handleSearchAgents = React.useCallback(
		async (query: string, role?: UserRole) => {
			try {
				setState({
					status: 'loading',
					data: undefined,
					error: '',
				})

				// build url with query params
				const params = new URLSearchParams({
					query: query.trim(),
					limit: '10',
				})

				// add role if provided
				if (role) {
					params.append('role', role.toString())
				}

				const response = await fetch(`/api/users/search?${params.toString()}`)

				if (!response.ok) {
					throw new Error('Error al buscar agentes')
				}

				// type the response
				const apiResponse: ApiResponse<UserWithRole[]> = await response.json()

				if ('error' in apiResponse) {
					console.error('Error de la API:', apiResponse.error)
					setState({
						status: 'error',
						data: undefined,
						error: apiResponse.error || 'Error al buscar agentes',
					})
					return []
				}

				// Mapear respuesta del API a tipo Agent
				const agents: UserWithRole[] = (apiResponse.data || []).map(
					(user) => user
				)

				setState({
					status: 'success',
					data: agents,
					error: '',
				})
				return agents
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Error desconocido al buscar agentes'
				console.error('Error fetching agents:', error)
				setState({
					status: 'error',
					data: undefined,
					error: errorMessage,
				})
				return []
			}
		},
		[]
	)

	// Extraer results del estado para mantener compatibilidad hacia atrás
	const results = state.status === 'success' ? state.data : []

	return {
		search,
		setSearch,
		results,
		state,
		handleSearchAgents,
	}
}
