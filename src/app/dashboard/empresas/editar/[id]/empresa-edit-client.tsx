'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmpresaForm } from '@/features/empresas/components/empresa-form'
import { EditEmpresaFormSkeleton } from '@/features/empresas/components/empresa-form-skeleton'
import { useEmpresa } from '@/features/empresas/hooks/use-empresa'
import { useEmpresaMutations } from '@/features/empresas/hooks/use-empresa-mutations'
import type { UpdateEmpresaFormData } from '@/features/empresas/lib/empresa-schemas'
import { toast } from 'sonner'

interface EmpresaEditClientProps {
	id: number
}

/**
 * Componente Cliente para la Página de Edición de Empresa
 */
export function EmpresaEditClient({ id }: EmpresaEditClientProps) {
	const router = useRouter()
	const { state: empresaState } = useEmpresa(id)
	const { updateEmpresa, updateState } = useEmpresaMutations()

	const handleSubmit = useCallback(
		async (data: UpdateEmpresaFormData) => {
			await updateEmpresa(id, data)
		},
		[updateEmpresa, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/empresas')
	}, [router])

	// Manejar respuesta de actualización
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Empresa actualizada exitosamente')
			router.push('/dashboard/empresas')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar empresa')
		}
	}, [updateState.status, updateState.error, router])

	// Renderizar según estado
	if (empresaState.status === 'loading') {
		return <EditEmpresaFormSkeleton />
	}

	if (empresaState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{empresaState.error}</div>
				<button
					onClick={() => router.push('/dashboard/empresas')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (empresaState.status === 'success') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">Editar Empresa</h1>
						<p className="text-muted-foreground mt-2">
							Modifique los datos de la empresa. El campo nombre está
							deshabilitado.
						</p>
					</div>

					<EmpresaForm
						mode="edit"
						initialData={empresaState.data}
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
