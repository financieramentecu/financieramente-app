'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { Category } from '../types/category.types'
import { categoryApi } from '../lib/category-api'

interface UseCategoryReturn {
	state: AsyncState<Category>
}

/**
 * Hook for getting a single category by ID
 *
 * @param id - Category ID
 * @returns Async state with the category
 *
 * @example
 * ```typescript
 * const { state } = useCategory(1)
 *
 * if (state.status === 'loading') return <Loading />
 * if (state.status === 'error') return <Error message={state.error} />
 * if (state.status === 'success') {
 *   return <CategoryDetail category={state.data} />
 * }
 * ```
 */
export function useCategory(id: number): UseCategoryReturn {
	const [state, setState] = useState<AsyncState<Category>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchCategory = useCallback(async () => {
		if (!id || id <= 0) {
			setState({
				status: 'error',
				data: undefined,
				error: 'ID de categoría inválido',
			})
			return
		}

		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await categoryApi.getCategory(id)

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
			console.error('Error al obtener categoría:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener categoría',
			})
		}
	}, [id])

	useEffect(() => {
		fetchCategory()
	}, [fetchCategory])

	return {
		state,
	}
}
