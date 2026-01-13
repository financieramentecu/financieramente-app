import { ApiResponse } from '@/features/shared/types/api-response.types'
import { AsyncState } from '@/features/shared/types/async-state.types'
import { Client } from '@prisma/client'
import React, { useState } from 'react'

export const useSearchClient = () => {
	const [search, setSearch] = useState('')
	const [state, setState] = useState<AsyncState<Client[]>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const handleSearchClient = React.useCallback(async (query: string) => {
		try {
			setState({
				status: 'loading',
				data: undefined,
				error: '',
			})

			const response = await fetch(
				`/api/clients/search?query=${encodeURIComponent(query)}&limit=10`
			)

			if (!response.ok) {
				throw new Error('Error al buscar clientes')
			}

			// Tipar la respuesta completa primero
			const apiResponse: ApiResponse<Client[]> = await response.json()

			if ('error' in apiResponse) {
				console.error('Error de la API:', apiResponse.error)
				setState({
					status: 'error',
					data: undefined,
					error: apiResponse.error || 'Error al buscar clientes',
				})
				return []
			}

			const clients = apiResponse.data || []

			setState({
				status: 'success',
				data: clients,
				error: '',
			})
			return clients
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Error desconocido al buscar clientes'
			console.error('Error fetching clients:', error)
			setState({
				status: 'error',
				data: undefined,
				error: errorMessage,
			})
			return []
		}
	}, [])

	// Extraer results del estado para mantener compatibilidad hacia atrás
	const results = state.status === 'success' ? state.data : []

	return {
		search,
		setSearch,
		results,
		state,
		handleSearchClient,
	}
}
