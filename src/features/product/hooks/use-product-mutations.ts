'use client'

import { useState, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type {
	Product,
	CreateProductInput,
	UpdateProductInput,
} from '../types/product.types'
import { productApi } from '../lib/product-api'

interface UseProductMutationsReturn {
	createState: AsyncState<Product>
	updateState: AsyncState<Product>
	deleteState: AsyncState<void>
	createProduct: (data: CreateProductInput) => Promise<void>
	updateProduct: (id: number, data: UpdateProductInput) => Promise<void>
	deleteProduct: (id: number) => Promise<void>
}

/**
 * Hook para mutaciones de productos (crear, actualizar, eliminar)
 *
 * @returns Estados asíncronos y funciones de mutación
 *
 * @example
 * ```typescript
 * const { createProduct, createState } = useProductMutations()
 *
 * const handleSubmit = async (data: CreateProductInput) => {
 *   await createProduct(data)
 *   if (createState.status === 'success') {
 *     router.push('/dashboard/products')
 *   }
 * }
 * ```
 */
export function useProductMutations(): UseProductMutationsReturn {
	const [createState, setCreateState] = useState<AsyncState<Product>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [updateState, setUpdateState] = useState<AsyncState<Product>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const [deleteState, setDeleteState] = useState<AsyncState<void>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const createProduct = useCallback(async (data: CreateProductInput) => {
		setCreateState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await productApi.createProduct(data)

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
			console.error('Error al crear producto:', error)
			setCreateState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear producto',
			})
		}
	}, [])

	const updateProduct = useCallback(
		async (id: number, data: UpdateProductInput) => {
			setUpdateState({ status: 'loading', data: undefined, error: '' })

			try {
				const response = await productApi.updateProduct(id, data)

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
				console.error('Error al actualizar producto:', error)
				setUpdateState({
					status: 'error',
					data: undefined,
					error:
						error instanceof Error
							? error.message
							: 'Error desconocido al actualizar producto',
				})
			}
		},
		[]
	)

	const deleteProduct = useCallback(async (id: number) => {
		setDeleteState({ status: 'loading', data: undefined, error: '' })

		try {
			const response = await productApi.deleteProduct(id)

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
			console.error('Error al eliminar producto:', error)
			setDeleteState({
				status: 'error',
				data: undefined,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar producto',
			})
		}
	}, [])

	return {
		createState,
		updateState,
		deleteState,
		createProduct,
		updateProduct,
		deleteProduct,
	}
}
