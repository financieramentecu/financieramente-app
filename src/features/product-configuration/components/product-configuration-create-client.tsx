'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductConfigurationForm } from './product-configuration-form'
import { ConfigurationDistributionStepper } from './configuration-distribution-stepper'
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
			const created = await createProductConfiguration(
				data as unknown as CreateProductConfigurationInput
			)
			if (created?.code?.trim()) {
				toast.success('Configuración de producto creada exitosamente')
				const encoded = encodeURIComponent(created.code.trim())
				router.replace(
					`/dashboard/config-distribucion-comisiones/${encoded}/reglas/crear`
				)
				return
			}
			if (created === null) {
				return
			}
			toast.success('Configuración de producto creada exitosamente')
			router.replace('/dashboard/configuraciones-producto')
		},
		[createProductConfiguration, router]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/configuraciones-producto')
	}, [router])

	useEffect(() => {
		if (createState.status === 'error') {
			toast.error(
				createState.error ||
					'Error al crear configuración de producto'
			)
		}
	}, [createState.status, createState.error])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<ConfigurationDistributionStepper currentStep={1} />
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
