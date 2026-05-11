'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	CategoryListResponse,
	CategoryFilters,
} from '../types/category.types'
import { categoryApi } from '../lib/category-api'

interface UseCategoriesParams extends CategoryFilters {
	page?: number
	pageSize?: number
}

interface UseCategoriesReturn {
	state: AsyncState<CategoryListResponse>
	refetch: () => Promise<void>
}

/**
 * Hook for getting the list of categories with pagination and search
 */
export function useCategories(params: UseCategoriesParams = {}): UseCategoriesReturn {
	const { page, pageSize, search, status } = params

	const [state, setState] = useState<AsyncState<CategoryListResponse>>({
		status: 'loading',
		data: undefined,
		error: '',
	})

	const fetchCategories = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await categoryApi.getCategories({
				page,
				pageSize,
				search,
				status,
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
			console.error('Error al obtener categorías:', error)
			setState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al obtener categorías',
			})
		}
	}, [page, pageSize, search, status])

	useEffect(() => {
		fetchCategories()
	}, [fetchCategories])

	return {
		state,
		refetch: fetchCategories,
	}
}
