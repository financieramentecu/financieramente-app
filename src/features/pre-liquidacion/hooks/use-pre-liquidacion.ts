'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
    RespuestaArchivosDisponibles,
    RespuestaProcesamientoPreLiquidacion,
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

    const fetchArchivos = useCallback(async () => {
        setState({ status: 'loading', data: undefined, error: '' })

        try {
            const response = await fetch('/api/pre-liquidacion/archivos')

            if (!response.ok) {
                const error = await response.json()
                setState({
                    status: 'error',
                    data: undefined,
                    error: error.error || 'Error al obtener archivos',
                })
                return
            }

            const data = await response.json()
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
        async (fileImportId: number) => {
            setIsProcesando(true)
            setErrorProcesamiento(null)
            setMensajeExito(null)

            try {
                const response = await fetch('/api/pre-liquidacion/procesar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fileImportId }),
                })

                if (!response.ok) {
                    const error = await response.json()
                    setErrorProcesamiento(error.error || 'Error al procesar')
                    return
                }

                const result: RespuestaProcesamientoPreLiquidacion =
                    await response.json()

                if (result.success) {
                    setMensajeExito(
                        `Pre-liquidación completada: ${result.registrosProcesados} registros procesados`
                    )
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
    }
}
