'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	ProductConfigurationListResponse,
	ProductConfigurationFilters,
} from '../types/product-configuration.types'
import { productConfigurationApi } from '../lib/product-configuration-api'

interface UseProductConfigurationsParams
	extends ProductConfigurationFilters {
	page?: number
	pageSize?: number
}

interface UseProductConfigurationsReturn {
	state: AsyncState<ProductConfigurationListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook for getting the list of product configurations with pagination and search
 */
export function useProductConfigurations(
	params: UseProductConfigurationsParams = {}
): UseProductConfigurationsReturn {
	const { page, pageSize, search, active } = params

	const [state, setState] =
		useState<AsyncState<ProductConfigurationListResponse>>({
			status: 'loading',
			data: undefined,
			error: '',
		})

	const fetchConfigurations = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response =
				await productConfigurationApi.getProductConfigurations({
					page,
					pageSize,
					search,
					active,
				})

			if ('error' in response) {
				setState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setState({
					status: 'success',
					data: response.data,
					error: '',
				})
			}
		} catch (error) {
			console.error(
				'Error al obtener configuraciones de producto:',
				error
			)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener configuraciones de producto',
			})
		}
	}, [page, pageSize, search, active])

	useEffect(() => {
		fetchConfigurations()
	}, [fetchConfigurations])

	return {
		state,
		refetch: fetchConfigurations,
	}
}
