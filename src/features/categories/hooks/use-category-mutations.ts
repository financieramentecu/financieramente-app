'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	Category,
	CreateCategoryInput,
	UpdateCategoryInput,
} from '../types/category.types'
import { categoryApi } from '../lib/category-api'

interface UseCategoryMutationsReturn {
	createState: AsyncState<Category>
	updateState: AsyncState<Category>
	deleteState: AsyncState<void>
	createCategory: (data: CreateCategoryInput) => Promise<void>
	updateCategory: (id: number, data: UpdateCategoryInput) => Promise<void>
	deleteCategory: (id: number) => Promise<void>
}

/**
 * Hook for category mutations (create, update, delete)
 *
 * @returns Async states and mutation functions
 *
 * @example
 * ```typescript
 * const { createCategory, createState } = useCategoryMutations()
 *
 * const handleSubmit = async (data: CreateCategoryInput) => {
 *   await createCategory(data)
 *   if (createState.status === 'success') {
 *     router.push('/dashboard/categorias')
 *   }
 * }
 * ```
 */
export function useCategoryMutations(): UseCategoryMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<Category>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<Category>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createCategory = useCallback(async (data: CreateCategoryInput) => {
		setCreateState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await categoryApi.createCategory(data)

			if ('error' in response) {
				setCreateState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setCreateState({
					status: 'success',
					data: response.data,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al crear categoría:', error)
			setCreateState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear categoría',
			})
		}
	}, [])

	const updateCategory = useCallback(
		async (id: number, data: UpdateCategoryInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await categoryApi.updateCategory(id, data)

				if ('error' in response) {
					setUpdateState({
						status: 'error',
						data: undefined,
						error: response.error,
					})
				} else {
					setUpdateState({
						status: 'success',
						data: response.data,
						error: '',
					})
				}
			} catch (error) {
				console.error('Error al actualizar categoría:', error)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar categoría',
				})
			}
		},
		[]
	)

	const deleteCategory = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await categoryApi.deleteCategory(id)

			if ('error' in response) {
				setDeleteState({
					status: 'error',
					data: undefined,
					error: response.error,
				})
			} else {
				setDeleteState({
					status: 'success',
					data: undefined,
					error: '',
				})
			}
		} catch (error) {
			console.error('Error al eliminar categoría:', error)
			setDeleteState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar categoría',
			})
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createCategory,
		updateCategory,
		deleteCategory,
	}
}
