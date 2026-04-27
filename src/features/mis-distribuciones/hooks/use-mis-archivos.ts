'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { RespuestaMisArchivos } from '../types/types'

/**
 * Fetches the list of files with distribution for the current user (or a
 * target userId when the viewer has hierarchy access).
 */
export function useMisArchivos(targetUserId?: number) {
	const [state, setState] = useState<AsyncState<RespuestaMisArchivos>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchArchivos = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const qs = targetUserId ? `?userId=${targetUserId}` : ''
			const res = await fetch(`/api/mis-distribuciones${qs}`)
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
			const data = parsed.data ?? parsed
			setState({ status: 'success', data, error: '' })
		} catch (err) {
			setState({
				status: 'error',
				data: undefined,
				error:
					err instanceof Error
						? err.message
						: 'Error al obtener archivos con distribución',
			})
		}
	}, [targetUserId])

	useEffect(() => {
		fetchArchivos()
	}, [fetchArchivos])

	return {
		archivos: state.status === 'success' ? state.data.archivos : [],
		nombreUsuario:
			state.status === 'success' ? state.data.nombreUsuario : '',
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchArchivos,
	}
}
