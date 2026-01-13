'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	ProductListResponse,
	ProductFilters,
} from '../types/product.types'
import { productApi } from '../lib/product-api'

interface UseProductsParams extends ProductFilters {
	page?: number
	pageSize?: number
}

interface UseProductsReturn {
	state: AsyncState<ProductListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener la lista de productos con paginación y búsqueda
 *
 * @param params - Parámetros de búsqueda y paginación
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useProducts({ page: 1, pageSize: 10, search: 'Product' })
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <ProductsTable products={state.data.products} />
 * }
 * ```
 */
export function useProducts(params: UseProductsParams = {}): UseProductsReturn {
	const [state, setState] = useState<AsyncState<ProductListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchProducts = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await productApi.getProducts(params)

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
			console.error('Error al obtener productos:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener productos',
			})
		}
	}, [
		params.page,
		params.pageSize,
		params.search,
		params.status,
		params.idCompany,
	])

	useEffect(() => {
		fetchProducts()
	}, [fetchProducts])

	return {
		state,
		refetch: fetchProducts,
	}
}
