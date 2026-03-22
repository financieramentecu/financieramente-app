'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	RespuestaRegistrosLiquidacion,
	RegistroLiquidacionDetalle,
} from '../types/types'

interface UseRegistrosLiquidacionReturn {
	registros: RegistroLiquidacionDetalle[]
	archivo: RespuestaRegistrosLiquidacion['archivo'] | null
	isLoading: boolean
	error: string | null
	refetch: () => Promise<void>
}

/**
 * Fetches SYNCHRONIZED records for the pre-liquidación detail page.
 */
export function useRegistrosLiquidacion(
	fileId: number | null
): UseRegistrosLiquidacionReturn {
	const [state, setState] = useState<
		AsyncState<RespuestaRegistrosLiquidacion>
	>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchRegistros = useCallback(async () => {
		if (fileId == null || fileId <= 0) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await fetch(`/api/pre-liquidacion/registros/${fileId}`)

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
			const data = parsed.data !== undefined ? parsed.data : parsed

			setState({ status: 'success', data, error: '' })
		} catch (err) {
			console.error('Error al obtener registros para liquidación:', err)
			setState({
				status: 'error',
				data: undefined,
				error:
					err instanceof Error ? err.message : 'Error al cargar registros',
			})
		}
	}, [fileId])

	useEffect(() => {
		fetchRegistros()
	}, [fetchRegistros])

	return {
		registros: state.status === 'success' ? state.data.registros : [],
		archivo: state.status === 'success' ? state.data.archivo : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchRegistros,
	}
}
