'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
    RespuestaResultadosPreLiquidacion,
    FiltrosResultados,
} from '../types/types'

/**
 * Hook para obtener y gestionar resultados de pre-liquidación
 */
export function useResultadosPreLiquidacion(fileId: number) {
    const [page, setPage] = useState(1)
    const [pageSize] = useState(100)
    const [filtros, setFiltros] = useState<FiltrosResultados>({})

    const [state, setState] = useState<
        AsyncState<RespuestaResultadosPreLiquidacion>
    >({
        status: 'loading',
        data: undefined,
        error: '',
    })

    const fetchResultados = useCallback(async () => {
        if (!fileId) return

        setState({ status: 'loading', data: undefined, error: '' })

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            })

            if (filtros.minComision) {
                params.append('minComision', filtros.minComision.toString())
            }
            if (filtros.maxComision) {
                params.append('maxComision', filtros.maxComision.toString())
            }
            if (filtros.producto) {
                params.append('producto', filtros.producto)
            }
            if (filtros.tipoComision) {
                params.append('tipoComision', filtros.tipoComision)
            }

            const response = await fetch(
                `/api/pre-liquidacion/resultados/${fileId}?${params.toString()}`
            )

            if (!response.ok) {
                const contentType = response.headers.get('content-type')
                const error = contentType?.includes('application/json')
                    ? await response.json().catch(() => ({ error: `Error ${response.status}` }))
                    : { error: `Error ${response.status}: ${response.statusText}` }
                setState({
                    status: 'error',
                    data: undefined,
                    error: error.error || 'Error al obtener resultados',
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

            const data = JSON.parse(text)
            setState({
                status: 'success',
                data,
                error: '',
            })
        } catch (error) {
            console.error('Error al obtener resultados:', error)
            setState({
                status: 'error',
                data: undefined,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Error desconocido al obtener resultados',
            })
        }
    }, [fileId, page, pageSize, filtros])

    useEffect(() => {
        fetchResultados()
    }, [fetchResultados])

    return {
        resultados: state.data?.resultados || [],
        paginacion: state.data?.paginacion,
        categoriasUnicas: state.data?.categoriasUnicas || [],
        isLoading: state.status === 'loading',
        error: state.error || null,
        refetch: fetchResultados,
        // Funciones de paginación
        page,
        setPage,
        siguientePagina: () => {
            if (state.data?.paginacion && page < state.data.paginacion.totalPaginas) {
                setPage(page + 1)
            }
        },
        paginaAnterior: () => {
            if (page > 1) {
                setPage(page - 1)
            }
        },
        // Funciones de filtrado
        filtros,
        setFiltros,
        limpiarFiltros: () => {
            setFiltros({})
            setPage(1)
        },
    }
}
