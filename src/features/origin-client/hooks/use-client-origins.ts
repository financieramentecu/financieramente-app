'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	ClientOriginListResponse,
	ClientOriginFilters,
} from '../types/client-origin.types'
import { clientOriginApi } from '../lib/client-origin-api'

interface UseClientOriginsParams extends ClientOriginFilters {
	page?: number
	pageSize?: number
}

interface UseClientOriginsReturn {
	state: AsyncState<ClientOriginListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener la lista de orígenes de cliente con paginación y búsqueda
 *
 * @param params - Parámetros de búsqueda y paginación
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useClientOrigins({ page: 1, pageSize: 10, search: 'Propio' })
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <ClientOriginsTable origins={state.data.origins} />
 * }
 * ```
 */
export function useClientOrigins(
	params: UseClientOriginsParams = {}
): UseClientOriginsReturn {
	const [state, setState] = useState<AsyncState<ClientOriginListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchClientOrigins = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await clientOriginApi.getClientOrigins(params)

			if ('error' in response) {
				setState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setState({
					status: 'success',
					data: response.data,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al obtener orígenes de cliente:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener orígenes de cliente',
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.page, params.pageSize, params.search, params.status])

	useEffect(() => {
		fetchClientOrigins()
	}, [fetchClientOrigins])

	return {
		state,
		refetch: fetchClientOrigins,
	}
}

