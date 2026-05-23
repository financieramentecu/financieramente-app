'use client'

/**
 * Hook para obtener lista de negocios con paginación y filtros
 *
 * Utiliza AsyncState para manejar el estado asíncrono de forma unificada,
 * permitiendo type narrowing automático basado en el campo status.
 */

import { useState, useEffect, useCallback } from 'react'
import { businessService } from '../services/business.service'
import type { BusinessEntity } from '../types/business-entity.types'
import type {
	BusinessListParams,
	BusinessListResponse,
} from '../types/business-api.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

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
	refetch: () => Promise<void>
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
	params: BusinessListParams = {}
): UseBusinessesReturn {
	const [state, setState] = useState<AsyncState<BusinessListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchBusinesses = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const hasFullFundDateRange = Boolean(
				params.dateFrom && params.dateTo
			)
			const hasFullCreatedDateRange = Boolean(params.createdFrom && params.createdTo)

			const response = await businessService.getAll({
				page: params.page || 1,
				pageSize: params.pageSize || 10,
				search: params.search,
				status: params.status,
				dateFrom: hasFullFundDateRange ? params.dateFrom : undefined,
				dateTo: hasFullFundDateRange ? params.dateTo : undefined,
				createdFrom: hasFullCreatedDateRange ? params.createdFrom : undefined,
				createdTo: hasFullCreatedDateRange ? params.createdTo : undefined,
				agentName: params.agentName,
				sortBy: params.sortBy,
				sortOrder: params.sortOrder,
				companyIds: params.companyIds,
				productIds: params.productIds,
				originIds: params.originIds,
			})

			if ('error' in response && response.error) {
				setState({ status: 'error', data: undefined, error: response.error })
			} else if (response.data) {
				setState({ status: 'success', data: response.data, error: '' })
			}
		} catch (err) {
			console.error('Error al obtener negocios:', err)
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar negocios',
			})
		}
	}, [
		params.page,
		params.pageSize,
		params.search,
		params.status,
		params.dateFrom,
		params.dateTo,
		params.createdFrom,
		params.createdTo,
		params.agentName,
		params.sortBy,
		params.sortOrder,
		params.companyIds,
		params.productIds,
		params.originIds,
	])

	useEffect(() => {
		fetchBusinesses()
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
