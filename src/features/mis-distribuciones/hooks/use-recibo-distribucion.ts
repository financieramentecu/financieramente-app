'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ReciboMensualDistribucion } from '../types/types'

/**
 * Fetches the receipt-style detail of distribution for a given file import.
 * When `targetUserId` is provided, queries that user's receipt (requires
 * hierarchy/backoffice permission server-side).
 */
export function useReciboDistribucion(
	fileId: number | null,
	targetUserId?: number
) {
	const [state, setState] = useState<AsyncState<ReciboMensualDistribucion>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchRecibo = useCallback(async () => {
		if (fileId == null || fileId <= 0) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const qs = targetUserId ? `?userId=${targetUserId}` : ''
			const res = await fetch(`/api/mis-distribuciones/${fileId}${qs}`)
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				setState({
					status: 'error',
					data: undefined,
					error:
						typeof body.error === 'string'
							? body.error
							: `Error ${res.status}`,
				})
				return
			}
			const parsed = await res.json()
			const recibo =
				parsed.data?.recibo ?? parsed.recibo ?? parsed.data ?? null
			if (!recibo) {
				setState({
					status: 'error',
					data: undefined,
					error: 'Recibo no disponible',
				})
				return
			}
			setState({ status: 'success', data: recibo, error: '' })
		} catch (err) {
			setState({
				status: 'error',
				data: undefined,
				error:
					err instanceof Error
						? err.message
						: 'Error al obtener recibo de distribución',
			})
		}
	}, [fileId, targetUserId])

	useEffect(() => {
		fetchRecibo()
	}, [fetchRecibo])

	return {
		recibo: state.status === 'success' ? state.data : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchRecibo,
	}
}
