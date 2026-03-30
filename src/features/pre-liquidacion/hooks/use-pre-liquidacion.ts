'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	RespuestaArchivosDisponibles,
	RespuestaProcesamientoPreLiquidacion,
	RegistroConError,
} from '../types/types'

/**
 * Hook para gestionar archivos disponibles y procesar pre-liquidación
 */
export function usePreLiquidacion() {
	const [state, setState] = useState<AsyncState<RespuestaArchivosDisponibles>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const [isProcesando, setIsProcesando] = useState(false)
	const [errorProcesamiento, setErrorProcesamiento] = useState<string | null>(
		null
	)
	const [mensajeExito, setMensajeExito] = useState<string | null>(null)
	const [registrosConError, setRegistrosConError] = useState<RegistroConError[]>([])
	const [modalErroresOpen, setModalErroresOpen] = useState(false)

	const fetchArchivos = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await fetch('/api/pre-liquidacion/archivos')

			if (!response.ok) {
				const contentType = response.headers.get('content-type')
				const error = contentType?.includes('application/json')
					? await response
							.json()
							.catch(() => ({ error: `Error ${response.status}` }))
					: { error: `Error ${response.status}: ${response.statusText}` }
				setState({
					status: 'error',
					data: undefined,
					error: error.error || 'Error al obtener archivos',
				})
				return
			}

			const contentType = response.headers.get('content-type')
			if (!contentType?.includes('application/json')) {
				const text = await response.text()
				setState({
					status: 'error',
					data: undefined,
					error: text || 'Respuesta no-JSON recibida',
				})
				return
			}

			const text = await response.text()
			if (!text) {
				setState({
					status: 'error',
					data: undefined,
					error: 'Respuesta vacía del servidor',
				})
				return
			}

			const parsed = JSON.parse(text)
			// Extraer de data.data si el payload viene normalizado como ApiResponse
			const data = parsed.data !== undefined ? parsed.data : parsed

			console.log('data', data)
			setState({
				status: 'success',
				data,
				error: '',
			})
		} catch (error) {
			console.error('Error al obtener archivos:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener archivos',
			})
		}
	}, [])

	const procesarPreLiquidacion = useCallback(
		async (fileImportId: number, mes: string) => {
			setIsProcesando(true)
			setErrorProcesamiento(null)
			setMensajeExito(null)

			try {
				const response = await fetch('/api/pre-liquidacion/procesar', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ fileImportId, mes }),
				})

				if (!response.ok) {
					const contentType = response.headers.get('content-type')
					const error = contentType?.includes('application/json')
						? await response
								.json()
								.catch(() => ({ error: `Error ${response.status}` }))
						: { error: `Error ${response.status}: ${response.statusText}` }
					setErrorProcesamiento(error.error || 'Error al procesar')
					return
				}

				const contentType = response.headers.get('content-type')
				if (!contentType?.includes('application/json')) {
					const text = await response.text()
					setErrorProcesamiento(text || 'Respuesta no-JSON recibida')
					return
				}

				const text = await response.text()
				if (!text) {
					setErrorProcesamiento('Respuesta vacía del servidor')
					return
				}

				const result: RespuestaProcesamientoPreLiquidacion = JSON.parse(text)

				if (result.success) {
					setMensajeExito(
						`Pre-liquidación completada: ${result.registrosProcesados} registros procesados`
					)
					if (result.registrosConError && result.registrosConError.length > 0) {
						setRegistrosConError(result.registrosConError)
						setModalErroresOpen(true)
					}
					// Refrescar lista de archivos
					await fetchArchivos()
				}
			} catch (error) {
				console.error('Error al procesar pre-liquidación:', error)
				setErrorProcesamiento(
					error instanceof Error ? error.message : 'Error desconocido'
				)
			} finally {
				setIsProcesando(false)
			}
		},
		[fetchArchivos]
	)

	useEffect(() => {
		fetchArchivos()
	}, [fetchArchivos])

	return {
		archivos: state.data?.archivos || [],
		resumen: state.data?.resumen,
		isLoading: state.status === 'loading',
		error: state.error || null,
		refetch: fetchArchivos,
		procesarPreLiquidacion,
		isProcesando,
		errorProcesamiento,
		mensajeExito,
		registrosConError,
		modalErroresOpen,
		cerrarModalErrores: () => setModalErroresOpen(false),
	}
}
