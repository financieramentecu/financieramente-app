'use client'

/**
 * Hook para obtener lista de negocios con paginación y filtros
 *
 * Utiliza AsyncState para manejar el estado asíncrono de forma unificada,
 * permitiendo type narrowing automático basado en el campo status.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { businessService } from '../services/business.service'
import type { BusinessEntity } from '../types/business-entity.types'
import type {
	BusinessListParams,
	BusinessListResponse,
} from '../types/business-api.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { toBusinessListRequest } from '../lib/to-business-list-request'
import { claimInitialRender, type InitialData } from '../lib/initial-render-claim'

/** Paginación por defecto */
const DEFAULT_PAGINATION = {
	page: 1,
	pageSize: 10,
	total: 0,
	totalPages: 0,
}

interface UseBusinessesReturn {
	businesses: BusinessEntity[]
	isLoading: boolean
	error: string | null
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
	refetch: (isBackground?: boolean) => Promise<void>
}

/**
 * Hook para obtener lista de negocios
 *
 * @param params - Parámetros de búsqueda y paginación
 * @returns Estado de negocios y función de refetch
 *
 * @example
 * ```typescript
 * const { businesses, isLoading, error, pagination, refetch } = useBusinesses({
 *   page: 1,
 *   pageSize: 10,
 *   search: 'Juan',
 * })
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 *
 * return <BusinessList businesses={businesses} />
 * ```
 */
export function useBusinesses(
	params: BusinessListParams = {},
	initial?: InitialData<BusinessListResponse>
): UseBusinessesReturn {
	const [state, setState] = useState<AsyncState<BusinessListResponse>>(
		initial
			? { status: 'success', data: initial.data, error: '' }
			: { status: 'loading', data: undefined, error: '' }
	)

	const paramsKey = JSON.stringify(params)
	// Params the server-provided data belongs to; cleared once they change.
	const initialKeyRef = useRef(initial ? paramsKey : null)
	// Whether this instance owns the server render's data (null until claimed).
	const ownsInitialRef = useRef<boolean | null>(null)

	// Guards against out-of-order responses: if params change quickly (e.g.
	// applying a filter right after the initial unfiltered load), a slower
	// older request can resolve AFTER a newer one and overwrite it with stale
	// results. Only the response matching the latest fired request is applied.
	const latestRequestId = useRef(0)

	const fetchBusinesses = useCallback(async (isBackground: boolean = false) => {
		const requestId = ++latestRequestId.current

		if (!isBackground) {
			setState({ status: 'loading', data: undefined, error: '' })
		}

		try {
			const response = await businessService.getAll(
				toBusinessListRequest(params)
			)

			if (requestId !== latestRequestId.current) return

			if ('error' in response && response.error) {
				setState({ status: 'error', data: undefined, error: response.error })
			} else if (response.data) {
				setState({ status: 'success', data: response.data, error: '' })
			}
		} catch (err) {
			if (requestId !== latestRequestId.current) return

			console.error('Error al obtener negocios:', err)
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar negocios',
			})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paramsKey])

	useEffect(() => {
		if (initial && initialKeyRef.current === paramsKey) {
			// Claim once per mounted instance (kept in a ref) so React StrictMode's
			// double effect run does not mistake the second run for a remount.
			if (ownsInitialRef.current === null) {
				ownsInitialRef.current = claimInitialRender(`list:${initial.renderId}`)
			}
			// First mount of this server render: its data is current.
			if (ownsInitialRef.current) return
			// Same render mounted again (back/forward): refresh silently.
			void fetchBusinesses(true)
			return
		}
		initialKeyRef.current = null
		fetchBusinesses()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchBusinesses])

	// Retornar valores compatibles con la interfaz existente
	return {
		businesses: state.status === 'success' ? state.data.businesses : [],
		isLoading: state.status === 'loading',
		error: state.status === 'error' ? state.error : null,
		pagination:
			state.status === 'success' ? state.data.pagination : DEFAULT_PAGINATION,
		refetch: fetchBusinesses,
	}
}
