'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductConfigurationForm } from './product-configuration-form'
import { useProductConfigurationMutations } from '../hooks/use-product-configuration-mutations'
import type { CreateProductConfigurationInput } from '../types/product-configuration.types'
import { toast } from 'sonner'

/**
 * Client Component for Create Product Configuration Page
 */
export function ProductConfigurationCreateClient() {
	const router = useRouter()
	const { createProductConfiguration, createState } =
		useProductConfigurationMutations()

	const handleSubmit = useCallback(
		async (data: Record<string, unknown>) => {
			await createProductConfiguration(
				data as unknown as CreateProductConfigurationInput
			)
		},
		[createProductConfiguration]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/configuraciones-producto')
	}, [router])

	// Handle create response
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Configuración de producto creada exitosamente')
			router.push('/dashboard/configuraciones-producto')
		} else if (createState.status === 'error') {
			toast.error(
				createState.error ||
					'Error al crear configuración de producto'
			)
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">
						Nueva Configuración de Producto
					</h1>
					<p className="text-muted-foreground mt-2">
						Seleccione la combinación de producto, origen de
						cliente y categoría para crear una nueva
						configuración
					</p>
				</div>

				<ProductConfigurationForm
					mode="create"
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
