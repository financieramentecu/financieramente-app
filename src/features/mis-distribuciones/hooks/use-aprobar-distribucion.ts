'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { RespuestaAprobarDistribucion } from '../types/types'

interface UseAprobarDistribucionReturn {
	aprobar: (fileId: number) => Promise<RespuestaAprobarDistribucion | null>
	isApproving: boolean
	error: string | null
}

/**
 * Registra la aprobación ("Estoy de acuerdo") del usuario autenticado sobre
 * su distribución de un archivo.
 */
export function useAprobarDistribucion(): UseAprobarDistribucionReturn {
	const [isApproving, setIsApproving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const aprobar = useCallback(
		async (fileId: number) => {
			setIsApproving(true)
			setError(null)
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
					setError(msg)
					toast.error(msg)
					return null
				}
				const parsed = await res.json()
				const data: RespuestaAprobarDistribucion = parsed.data ?? parsed
				toast.success('Aprobación registrada correctamente')
				return data
			} catch (err) {
				const msg =
					err instanceof Error
						? err.message
						: 'Error al registrar aprobación'
				setError(msg)
				toast.error(msg)
				return null
			} finally {
				setIsApproving(false)
			}
		},
		[]
	)

	return { aprobar, isApproving, error }
}
