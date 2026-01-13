'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/features/product/components/product-form'
import { EditProductFormSkeleton } from '@/features/product/components/product-form-skeleton'
import { useProduct } from '@/features/product/hooks/use-product'
import { useProductMutations } from '@/features/product/hooks/use-product-mutations'
import type { UpdateProductFormData } from '@/features/product/lib/product-schemas'
import type { CompanyOption } from '@/features/product/types/product.types'
import { toast } from 'sonner'

interface ProductEditClientProps {
	id: number
	companies: CompanyOption[]
}

/**
 * Componente Cliente para la Página de Edición de Producto
 */
export function ProductEditClient({ id, companies }: ProductEditClientProps) {
	const router = useRouter()
	const { state: productState } = useProduct(id)
	const { updateProduct, updateState } = useProductMutations()

	const handleSubmit = useCallback(
		async (data: UpdateProductFormData) => {
			await updateProduct(id, data)
		},
		[updateProduct, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/products')
	}, [router])

	// Manejar respuesta de actualización
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Producto actualizado exitosamente')
			router.push('/dashboard/products')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar producto')
		}
	}, [updateState.status, updateState.error, router])

	// Renderizar según estado
	if (productState.status === 'loading') {
		return <EditProductFormSkeleton />
	}

	if (productState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{productState.error}</div>
				<button
					onClick={() => router.push('/dashboard/products')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (productState.status === 'success') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">Editar Producto</h1>
						<p className="text-muted-foreground mt-2">
							Modifique los datos del producto
						</p>
					</div>

					<ProductForm
						mode="edit"
						initialData={productState.data}
						companies={companies}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isLoading={updateState.status === 'loading'}
					/>
				</div>
			</div>
		)
	}

	return null
}
