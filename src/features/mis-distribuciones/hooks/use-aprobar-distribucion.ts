'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { RespuestaAprobarDistribucion } from '../types/types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface UseAprobarDistribucionReturn {
	aprobar: (fileId: number) => Promise<RespuestaAprobarDistribucion | null>
	state: AsyncState<RespuestaAprobarDistribucion>
	isApproving: boolean
	error: string | null
}

const INITIAL_STATE: AsyncState<RespuestaAprobarDistribucion> = {
	status: 'idle',
	data: undefined,
	error: '',
}

/**
 * Registra la aprobación ("Estoy de acuerdo") del usuario autenticado sobre
 * su distribución de un archivo.
 */
export function useAprobarDistribucion(): UseAprobarDistribucionReturn {
	const [state, setState] =
		useState<AsyncState<RespuestaAprobarDistribucion>>(INITIAL_STATE)

	const aprobar = useCallback(
		async (fileId: number): Promise<RespuestaAprobarDistribucion | null> => {
			setState({ status: 'loading', data: undefined, error: '' })
			try {
				const res = await fetch(
					`/api/mis-distribuciones/${fileId}/aprobar`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
					}
				)
				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					const msg =
						typeof body.error === 'string'
							? body.error
							: `Error ${res.status}`
					setState({ status: 'error', data: undefined, error: msg })
					toast.error(msg)
					return null
				}
				const parsed = await res.json()
				const data: RespuestaAprobarDistribucion = parsed.data ?? parsed
				setState({ status: 'success', data, error: '' })
				toast.success('Aprobación registrada correctamente')
				return data
			} catch (err) {
				const msg =
					err instanceof Error
						? err.message
						: 'Error al registrar aprobación'
				setState({ status: 'error', data: undefined, error: msg })
				toast.error(msg)
				return null
			}
		},
		[]
	)

	return {
		aprobar,
		state,
		isApproving: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
	}
}
