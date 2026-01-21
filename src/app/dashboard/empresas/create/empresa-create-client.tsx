'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmpresaForm } from '@/features/empresas/components/empresa-form'
import { useEmpresaMutations } from '@/features/empresas/hooks/use-empresa-mutations'
import type {
	CreateEmpresaFormData,
	UpdateEmpresaFormData,
} from '@/features/empresas/lib/empresa-schemas'
import { toast } from 'sonner'

/**
 * Componente Cliente para la Página de Creación de Empresa
 */
export function EmpresaCreateClient() {
	const router = useRouter()
	const { createEmpresa, createState } = useEmpresaMutations()

	const handleSubmit = useCallback(
		async (data: CreateEmpresaFormData | UpdateEmpresaFormData) => {
			// En modo create, siempre recibimos CreateEmpresaFormData
			await createEmpresa(data as CreateEmpresaFormData)
		},
		[createEmpresa]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/empresas')
	}, [router])

	// Manejar respuesta de creación
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Empresa creada exitosamente')
			router.push('/dashboard/empresas')
		} else if (createState.status === 'error') {
			toast.error(createState.error || 'Error al crear empresa')
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Nueva Empresa</h1>
					<p className="text-muted-foreground mt-2">
						Complete el formulario para crear una nueva empresa/agencia
					</p>
				</div>

				<EmpresaForm
					mode="create"
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
