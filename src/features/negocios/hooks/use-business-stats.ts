'use client'

/**
 * Hook para obtener estadísticas de negocios
 *
 * Utiliza AsyncState para manejar el estado asíncrono de forma unificada,
 * permitiendo type narrowing automático basado en el campo status.
 */

import { useState, useEffect, useCallback } from 'react'
import { businessService } from '../services/business.service'
import type { BusinessStatsResponse } from '../types/business-api.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface UseBusinessStatsReturn {
	stats: BusinessStatsResponse | null
	isLoading: boolean
	error: string | null
	refetch: () => Promise<void>
}

/**
 * Hook para obtener estadísticas de negocios
 *
 * @returns Estado de estadísticas y función de refetch
 *
 * @example
 * ```typescript
 * const { stats, isLoading, error, refetch } = useBusinessStats()
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 *
 * // Usar stats para mostrar estadísticas
 * return <StatsOverview statsData={statsData} />
 * ```
 */
export function useBusinessStats(): UseBusinessStatsReturn {
	const [state, setState] = useState<AsyncState<BusinessStatsResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchStats = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await businessService.getStats()

			if ('error' in response && response.error) {
				setState({ status: 'error', data: undefined, error: response.error })
			} else if (response.data) {
				setState({ status: 'success', data: response.data, error: '' })
			}
		} catch (err) {
			console.error('Error al obtener estadísticas:', err)
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar estadísticas',
			})
		}
	}, [])

	useEffect(() => {
		fetchStats()
	}, [fetchStats])

	// Retornar valores compatibles con la interfaz existente
	return {
		stats: state.status === 'success' ? state.data : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchStats,
	}
}
