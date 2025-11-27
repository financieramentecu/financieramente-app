'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { categoryApi } from '../lib/category-api'
import type {
	CreateCategoryInput,
	UpdateCategoryInput,
} from '../types/category.types'

export function useCategoryMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createCategory = async (data: CreateCategoryInput) => {
		try {
			setIsSubmitting(true)
			const category = await categoryApi.createCategory(data)
			toast.success('Categoría creada exitosamente')
			return category
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al crear categoría'
			toast.error('Error al crear categoría', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateCategory = async (id: number, data: UpdateCategoryInput) => {
		try {
			setIsSubmitting(true)
			const category = await categoryApi.updateCategory(id, data)
			toast.success('Categoría actualizada exitosamente')
			return category
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al actualizar categoría'
			toast.error('Error al actualizar categoría', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteCategory = async (id: number) => {
		try {
			setIsSubmitting(true)
			await categoryApi.deleteCategory(id)
			toast.success('Categoría desactivada exitosamente')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al desactivar categoría'
			toast.error('Error al desactivar categoría', { description: message })
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
