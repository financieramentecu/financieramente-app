'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { productApi } from '../lib/product-api'
import type {
	CreateProductInput,
	UpdateProductInput,
} from '../types/product.types'

export function useProductMutations() {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const createProduct = async (data: CreateProductInput) => {
		try {
			setIsSubmitting(true)
			const product = await productApi.createProduct(data)
			toast.success('Producto creado exitosamente')
			return product
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al crear producto'
			toast.error('Error al crear producto', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const updateProduct = async (id: number, data: UpdateProductInput) => {
		try {
			setIsSubmitting(true)
			const product = await productApi.updateProduct(id, data)
			toast.success('Producto actualizado exitosamente')
			return product
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al actualizar producto'
			toast.error('Error al actualizar producto', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	const deleteProduct = async (id: number) => {
		try {
			setIsSubmitting(true)
			await productApi.deleteProduct(id)
			toast.success('Producto desactivado exitosamente')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error al desactivar producto'
			toast.error('Error al desactivar producto', { description: message })
			throw error
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		createProduct,
		updateProduct,
		deleteProduct,
		isSubmitting,
	}
}
