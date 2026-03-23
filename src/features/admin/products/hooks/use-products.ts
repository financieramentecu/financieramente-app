'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import { productApi } from '@/features/product/lib/product-api'
import type {
	Product,
	ProductFilters,
	CompanyOption,
} from '@/features/product/types/product.types'

/**
 * Hook para obtener la lista de productos
 *
 * @param filters Filtros de búsqueda opcionales
 * @returns Estado asíncrono y función de refetch
 *
 * @example
 * ```typescript
 * const { state, refetch } = useProducts({ search: 'seguro' })
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <ProductsTable products={state.data} />
 * }
 * ```
 */
export function useProducts(filters?: ProductFilters) {
	const [state, setState] = useState<AsyncState<Product[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchProducts = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			// En admin se suele usar una lista plana por ahora para la tabla,
			// pero consumimos el API que soporta paginación.
			const response = await productApi.getProducts({
				...filters,
				pageSize: 100, // Tomamos un número alto para admin sin paginación explícita aún
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
					data: response.data.products,
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
	}, [filters])

	useEffect(() => {
		fetchProducts()
	}, [fetchProducts])

	return {
		state,
		refetch: fetchProducts,
	}
}

/**
 * Hook para obtener compañías activas para filtros y formularios
 *
 * @returns Estado asíncrono de las compañías
 */
export function useActiveCompanies() {
	const [state, setState] = useState<AsyncState<CompanyOption[]>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchCompanies = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await productApi.getActiveCompanies()
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
			console.error('Error al obtener compañías:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener compañías',
			})
		}
	}, [])

	useEffect(() => {
		fetchCompanies()
	}, [fetchCompanies])

	return {
		state,
		refetch: fetchCompanies,
	}
}
