'use client'

/**
 * Hook para obtener estadísticas de negocios (Resumen KPIs)
 *
 * Utiliza AsyncState para manejar el estado asíncrono de forma unificada.
 * Recalcula cuando cambian los filtros avanzados (misma shape que la lista).
 */

import { useState, useEffect, useCallback } from 'react'
import { businessService } from '../services/business.service'
import type { CoachKpiResponse } from '../types/business-api.types'
import type { BusinessFilterParams } from '../lib/business-api.schemas'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface UseBusinessStatsReturn {
	stats: CoachKpiResponse | null
	isLoading: boolean
	error: string | null
	refetch: (isBackground?: boolean) => Promise<void>
}

/**
 * Hook para obtener estadísticas de negocios filtradas
 *
 * @param params - Filtros avanzados (misma semántica que GET /api/negocios)
 */
export function useBusinessStats(
	params: Partial<BusinessFilterParams> = {}
): UseBusinessStatsReturn {
	const [state, setState] = useState<AsyncState<CoachKpiResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const paramsKey = JSON.stringify(params)

	const fetchStats = useCallback(
		async (isBackground: boolean = false) => {
			if (!isBackground) {
				setState({ status: 'loading', data: undefined, error: '' })
			}

			const parsed = JSON.parse(paramsKey) as Partial<BusinessFilterParams>

			try {
				const response = await businessService.getStats(parsed)

				if ('error' in response && response.error) {
					setState({
						status: 'error',
						data: undefined,
						error: response.error,
					})
				} else if (response.data) {
					setState({ status: 'success', data: response.data, error: '' })
				} else {
					// Empty / null payload → zeros (CA3)
					setState({
						status: 'success',
						data: {
							ventasEfectuadas: { count: 0, totalCop: 0, totalUsd: 0 },
							emitidos: { count: 0, totalCop: 0, totalUsd: 0, sinSoporte: 0 },
							fondeados: { count: 0, totalCop: 0, totalUsd: 0 },
						},
						error: '',
					})
				}
			} catch (err) {
				console.error('Error al obtener estadísticas:', err)
				setState({
					status: 'error',
					data: undefined,
					error: 'Error al cargar estadísticas',
				})
			}
		},
		[paramsKey]
	)

	useEffect(() => {
		fetchStats()
	}, [fetchStats])

	return {
		stats: state.status === 'success' ? state.data : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchStats,
	}
}
