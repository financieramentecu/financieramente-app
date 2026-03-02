'use client'

import { useCallback, useState } from 'react'
import { productApi } from '@/features/product/lib/product-api'
import type {
	CreateProductInput,
	UpdateProductInput,
} from '@/features/product/types/product.types'

/**
 * Hook para mutaciones de productos
 *
 * @returns Funciones para crear, actualizar y eliminar productos
 */
export function useProductMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const create = useCallback(async (data: CreateProductInput) => {
		setIsSubmitting(true)
		try {
			const result = await productApi.createProduct(data)
			if ('error' in result) {
				return { success: false, error: result.error }
			}
			return { success: true, data: result.data }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al crear producto',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	const update = useCallback(async (id: number, data: UpdateProductInput) => {
		setIsSubmitting(true)
		try {
			const result = await productApi.updateProduct(id, data)
			if ('error' in result) {
				return { success: false, error: result.error }
			}
			return { success: true, data: result.data }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al actualizar producto',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	const remove = useCallback(async (id: number) => {
		setIsSubmitting(true)
		try {
			const result = await productApi.deleteProduct(id)
			if ('error' in result) {
				return { success: false, error: result.error }
			}
			return { success: true }
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Error desconocido al eliminar producto',
			}
		} finally {
			setIsSubmitting(false)
		}
	}, [])

	return {
		create,
		update,
		remove,
		isSubmitting,
	}
}
