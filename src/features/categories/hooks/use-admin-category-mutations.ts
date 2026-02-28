'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { categoryApi } from '../lib/category-api'
import type {
	CreateCategoryInput,
	UpdateCategoryInput,
} from '../types/category.types'

export function useAdminCategoryMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createCategory = async (data: CreateCategoryInput) => {
		try {
			setIsSubmitting(true)
			const response = await categoryApi.createCategory(data)

			if ('error' in response && response.error) {
				toast.error('Error al crear categoría', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Categoría creada exitosamente')
			return response.data
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al crear categoría', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateCategory = async (id: number, data: UpdateCategoryInput) => {
		try {
			setIsSubmitting(true)
			const response = await categoryApi.updateCategory(id, data)

			if ('error' in response && response.error) {
				toast.error('Error al actualizar categoría', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Categoría actualizada exitosamente')
			return response.data
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al actualizar categoría', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteCategory = async (id: number) => {
		try {
			setIsSubmitting(true)
			const response = await categoryApi.deactivateCategory(id)

			if ('error' in response && response.error) {
				toast.error('Error al desactivar categoría', {
					description: response.error,
				})
				throw new Error(response.error)
			}

			toast.success('Categoría desactivada exitosamente')
		} catch (error) {
			if (!(error instanceof Error) || !error.message) {
				toast.error('Error al desactivar categoría', {
					description: 'Error desconocido',
				})
			}
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createCategory,
		updateCategory,
		deleteCategory,
		isSubmitting,
	}
}
