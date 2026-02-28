'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompanyForm } from '@/features/company/components/company-form'
import { useCompanyMutations } from '@/features/company/hooks/use-company-mutations'
import type {
	CreateCompanyFormData,
	UpdateCompanyFormData,
} from '@/features/company/lib/company-schemas'
import { toast } from 'sonner'

/**
 * Client Component for Create Company Page
 */
export function CompanyCreateClient() {
	const router = useRouter()
	const { createCompany, createState } = useCompanyMutations()

	const handleSubmit = useCallback(
		async (data: CreateCompanyFormData | UpdateCompanyFormData) => {
			await createCompany(data as CreateCompanyFormData)
		},
		[createCompany]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/admin/companies')
	}, [router])

	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Empresa creada exitosamente')
			router.push('/dashboard/admin/companies')
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

				<CompanyForm
					mode="create"
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
