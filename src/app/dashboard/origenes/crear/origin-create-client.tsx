'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientOriginForm } from '@/features/origins/components/client-origin-form'
import { useClientOriginMutations } from '@/features/origins/hooks/use-client-origin-mutations'
import type {
	CreateClientOriginFormData,
	UpdateClientOriginFormData,
} from '@/features/origins/lib/client-origin-schemas'
import { toast } from 'sonner'

/**
 * Componente Cliente para la Página de Creación de Origen de Cliente
 */
export function OriginCreateClient() {
	const router = useRouter()
	const { createClientOrigin, createState } = useClientOriginMutations()

	const handleSubmit = useCallback(
		async (data: CreateClientOriginFormData | UpdateClientOriginFormData) => {
			// En modo create, siempre recibimos CreateClientOriginFormData
			await createClientOrigin(data as CreateClientOriginFormData)
		},
		[createClientOrigin]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/origenes')
	}, [router])

	// Manejar respuesta de creación
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Origen creado exitosamente')
			router.push('/dashboard/origenes')
		} else if (createState.status === 'error') {
			toast.error(createState.error || 'Error al crear origen de cliente')
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Nuevo Origen de Cliente</h1>
					<p className="text-muted-foreground mt-2">
						Complete el formulario para crear un nuevo origen de cliente
					</p>
				</div>

				<ClientOriginForm
					mode="create"
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
