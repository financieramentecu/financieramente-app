'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ProductConfiguration } from '../types/product-configuration.types'
import { productConfigurationApi } from '../lib/product-configuration-api'

interface UseProductConfigurationReturn {
	state: AsyncState<ProductConfiguration>
}

/**
 * Hook for getting a single product configuration by ID
 */
export function useProductConfiguration(
	id: number
): UseProductConfigurationReturn {
	const [state, setState] = useState<AsyncState<ProductConfiguration>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchConfiguration = useCallback(async () => {
		if (!id || id <= 0) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de configuración de producto inválido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response =
				await productConfigurationApi.getProductConfiguration(id)

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
				'Error al obtener configuración de producto:',
				error
			)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener configuración de producto',
			})
		}
	}, [id])

	useEffect(() => {
		fetchConfiguration()
	}, [fetchConfiguration])

	return {
		state,
	}
}
