'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { DistribucionComision } from '../types/types'

interface UseDistribucionComisionReturn {
	distribucion: DistribucionComision | null
	isLoading: boolean
	error: string | null
	refetch: () => Promise<void>
}

/**
 * Fetches the commission distribution breakdown for a given settlement commission.
 * Lazy fetch: performs no request when id is null.
 * Mirrors useComisionesPreliquidadas pattern targeting
 * GET /api/pre-liquidacion/distribucion/[idSettlementCommission].
 */
export function useDistribucionComision(
	id: number | null
): UseDistribucionComisionReturn {
	const [state, setState] = useState<AsyncState<DistribucionComision>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchDistribucion = useCallback(async () => {
		if (id == null || id <= 0) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await fetch(
				`/api/pre-liquidacion/distribucion/${id}`
			)

			if (!response.ok) {
				const contentType = response.headers.get('content-type')
				const errBody = contentType?.includes('application/json')
					? await response.json().catch(() => ({}))
					: {}
				const errorMsg =
					typeof errBody.error === 'string'
						? errBody.error
						: `Error ${response.status}`
				setState({ status: 'error', data: undefined, error: errorMsg })
				return
			}

			const parsed = await response.json()
			const data: DistribucionComision =
				parsed.data?.distribucion ?? parsed.distribucion ?? parsed.data ?? parsed

			setState({ status: 'success', data, error: '' })
		} catch (err) {
			console.error('Error al obtener distribución de comisión:', err)
			setState({
				status: 'error',
				data: undefined,
				error:
					err instanceof Error
						? err.message
						: 'Error al cargar distribución de comisión',
			})
		}
	}, [id])

	useEffect(() => {
		fetchDistribucion()
	}, [fetchDistribucion])

	return {
		distribucion: state.status === 'success' ? state.data : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchDistribucion,
	}
}
