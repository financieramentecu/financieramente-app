'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientOriginForm } from '@/features/origins/components/client-origin-form'
import { EditClientOriginFormSkeleton } from '@/features/origins/components/client-origin-form-skeleton'
import { useClientOrigin } from '@/features/origins/hooks/use-client-origin'
import { useClientOriginMutations } from '@/features/origins/hooks/use-client-origin-mutations'
import type { UpdateClientOriginFormData } from '@/features/origins/lib/client-origin-schemas'
import { toast } from 'sonner'

interface OriginEditClientProps {
	id: number
}

/**
 * Componente Cliente para la Página de Edición de Origen de Cliente
 */
export function OriginEditClient({ id }: OriginEditClientProps) {
	const router = useRouter()
	const { state: originState } = useClientOrigin(id)
	const { updateClientOrigin, updateState } = useClientOriginMutations()

	const handleSubmit = useCallback(
		async (data: UpdateClientOriginFormData) => {
			await updateClientOrigin(id, data)
		},
		[updateClientOrigin, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/origenes')
	}, [router])

	// Manejar respuesta de actualización
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Origen de cliente actualizado exitosamente')
			router.push('/dashboard/origenes')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar origen de cliente')
		}
	}, [updateState.status, updateState.error, router])

	// Renderizar según estado
	if (originState.status === 'loading') {
		return <EditClientOriginFormSkeleton />
	}

	if (originState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{originState.error}</div>
				<button
					onClick={() => router.push('/dashboard/origenes')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (originState.status === 'success') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">Editar Origen de Cliente</h1>
						<p className="text-muted-foreground mt-2">
							Modifique los datos del origen de cliente
						</p>
					</div>

					<ClientOriginForm
						mode="edit"
						initialData={originState.data}
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
