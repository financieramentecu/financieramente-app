'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductConfigurationForm } from './product-configuration-form'
import { ProductConfigurationFormSkeleton } from './product-configuration-form-skeleton'
import { useProductConfiguration } from '../hooks/use-product-configuration'
import { useProductConfigurationMutations } from '../hooks/use-product-configuration-mutations'
import type { UpdateProductConfigurationInput } from '../types/product-configuration.types'
import { toast } from 'sonner'
import { Button } from '@/features/shared/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'

interface PpcOption {
	idProductPercentajeCommision: number
	active: boolean
}

interface ProductConfigurationEditClientProps {
	id: number
}

/**
 * Client Component for Edit Product Configuration Page
 */
export function ProductConfigurationEditClient({
	id,
}: ProductConfigurationEditClientProps) {
	const router = useRouter()
	const { state } = useProductConfiguration(id)
	const { updateProductConfiguration, updateState } =
		useProductConfigurationMutations()
	const [ppcOptions, setPpcOptions] = useState<PpcOption[]>([])

	// Fetch PPC options for this configuration
	useEffect(() => {
		if (state.status !== 'success') return

		async function fetchPpcOptions() {
			try {
				const response = await fetch(
					`/api/product-configurations/${id}/ppcs`,
					{ credentials: 'include' }
				)
				const result = await response.json()
				if (result.data) {
					setPpcOptions(result.data)
				}
			} catch (error) {
				console.error('Error fetching PPC options:', error)
				// Fallback: use the current PPC if available
				if (
					state.status === 'success' &&
					state.data.ppcNewBusinesses
				) {
					setPpcOptions([
						{
							idProductPercentajeCommision:
								state.data.ppcNewBusinesses.id,
							active: state.data.ppcNewBusinesses.active,
						},
					])
				}
			}
		}

		fetchPpcOptions()
	}, [state.status, id, state])

	const handleSubmit = useCallback(
		async (data: Record<string, unknown>) => {
			await updateProductConfiguration(
				id,
				data as unknown as UpdateProductConfigurationInput
			)
		},
		[id, updateProductConfiguration]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/configuraciones-producto')
	}, [router])

	// Handle update response
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success(
				'Configuración de producto actualizada exitosamente'
			)
			router.push('/dashboard/configuraciones-producto')
		} else if (updateState.status === 'error') {
			toast.error(
				updateState.error ||
					'Error al actualizar configuración de producto'
			)
		}
	}, [updateState.status, updateState.error, router])

	if (state.status === 'loading') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">
							Editar Configuración de Producto
						</h1>
						<p className="text-muted-foreground mt-2">
							Cargando configuración...
						</p>
					</div>
					<ProductConfigurationFormSkeleton />
				</div>
			</div>
		)
	}

	if (state.status === 'error') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
						<AlertCircle className="h-5 w-5" />
						<span>{state.error}</span>
					</div>
					<Button
						variant="outline"
						onClick={() =>
							router.push(
								'/dashboard/configuraciones-producto'
							)
						}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Volver al listado
					</Button>
				</div>
			</div>
		)
	}

	if (state.status !== 'success') return null

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">
						Editar Configuración de Producto
					</h1>
					<p className="text-muted-foreground mt-2">
						Modifique la referencia de comisión de porcentaje
						para nuevos negocios
					</p>
				</div>

				<ProductConfigurationForm
					mode="edit"
					initialData={state.data}
					ppcOptions={ppcOptions}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={updateState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
