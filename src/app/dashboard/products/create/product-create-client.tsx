'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/features/product/components/product-form'
import { useProductMutations } from '@/features/product/hooks/use-product-mutations'
import type {
	CreateProductFormData,
	UpdateProductFormData,
} from '@/features/product/lib/product-schemas'
import type { CompanyOption } from '@/features/product/types/product.types'
import { toast } from 'sonner'

interface ProductCreateClientProps {
	companies: CompanyOption[]
}

/**
 * Componente Cliente para la Página de Creación de Producto
 */
export function ProductCreateClient({ companies }: ProductCreateClientProps) {
	const router = useRouter()
	const { createProduct, createState } = useProductMutations()

	const handleSubmit = useCallback(
		async (data: CreateProductFormData | UpdateProductFormData) => {
			// En modo create, siempre recibimos CreateProductFormData
			await createProduct(data as CreateProductFormData)
		},
		[createProduct]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/products')
	}, [router])

	// Manejar respuesta de creación
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Producto creado exitosamente')
			router.push('/dashboard/products')
		} else if (createState.status === 'error') {
			toast.error(createState.error || 'Error al crear producto')
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Nuevo Producto</h1>
					<p className="text-muted-foreground mt-2">
						Complete el formulario para crear un nuevo producto
					</p>
				</div>

				<ProductForm
					mode="create"
					companies={companies}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
