'use client'

/**
 * Hook para obtener y gestionar el detalle de un negocio
 *
 * Utiliza AsyncState para manejar el estado asíncrono de forma unificada,
 * permitiendo type narrowing automático basado en el campo status.
 */

import { useState, useEffect, useCallback } from 'react'
import { businessService } from '../services/business.service'
import type { BusinessEntity } from '../types/business-entity.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

interface UseBusinessDetailReturn {
	business: BusinessEntity | null
	isLoading: boolean
	error: string | null
	refetch: () => Promise<void>
}

/**
 * Hook para obtener el detalle de un negocio
 *
 * @param id - ID del negocio a obtener
 * @returns Estado del negocio y funciones de control
 *
 * @example
 * ```typescript
 * const { business, isLoading, error } = useBusinessDetail(businessId)
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 * if (!business) return <NotFound />
 * ```
 */
export function useBusinessDetail(id: number | null): UseBusinessDetailReturn {
	const [state, setState] = useState<AsyncState<BusinessEntity>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchBusiness = useCallback(async () => {
		if (!id) {
			setState({ status: 'idle', data: undefined, error: '' })
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await businessService.getById(id)

			if ('error' in response && response.error) {
				setState({ status: 'error', data: undefined, error: response.error })
			} else if (response.data) {
				setState({ status: 'success', data: response.data, error: '' })
			}
		} catch (err) {
			console.error('Error al obtener negocio:', err)
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar el negocio',
			})
		}
	}, [id])

	useEffect(() => {
		fetchBusiness()
	}, [fetchBusiness])

	// Retornar valores compatibles con la interfaz existente
	return {
		business: state.status === 'success' ? state.data : null,
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		refetch: fetchBusiness,
	}
}
