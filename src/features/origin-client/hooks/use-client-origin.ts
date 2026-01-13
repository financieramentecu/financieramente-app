'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ClientOrigin } from '../types/client-origin.types'
import { clientOriginApi } from '../lib/client-origin-api'

interface UseClientOriginReturn {
	state: AsyncState<ClientOrigin>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener un origen de cliente por ID
 *
 * @param id - ID del origen de cliente a obtener
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useClientOrigin(1)
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <ClientOriginForm initialData={state.data} />
 * }
 * ```
 */
export function useClientOrigin(id: number): UseClientOriginReturn {
	const [state, setState] = useState<AsyncState<ClientOrigin>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchClientOrigin = useCallback(async () => {
		if (!id) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de origen de cliente no válido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await clientOriginApi.getClientOrigin(id)

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
			console.error('Error al obtener origen de cliente:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener origen de cliente',
			})
		}
	}, [id])

	useEffect(() => {
		fetchClientOrigin()
	}, [fetchClientOrigin])

	return {
		state,
		refetch: fetchClientOrigin,
	}
}

