'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { Product } from '../types/product.types'
import { productApi } from '../lib/product-api'

interface UseProductReturn {
	state: AsyncState<Product>
	refetch: () => Promise<void>
}

/**
 * Hook para obtener un producto por ID
 *
 * @param id - ID del producto a obtener
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useProduct(1)
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <ProductForm initialData={state.data} />
 * }
 * ```
 */
export function useProduct(id: number): UseProductReturn {
	const [state, setState] = useState<AsyncState<Product>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchProduct = useCallback(async () => {
		if (!id) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de producto no válido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await productApi.getProduct(id)

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
			console.error('Error al obtener producto:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener producto',
			})
		}
	}, [id])

	useEffect(() => {
		fetchProduct()
	}, [fetchProduct])

	return {
		state,
		refetch: fetchProduct,
	}
}
