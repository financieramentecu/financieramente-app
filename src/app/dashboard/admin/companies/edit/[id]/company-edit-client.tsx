'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompanyForm } from '@/features/company/components/company-form'
import { EditCompanyFormSkeleton } from '@/features/company/components/company-form-skeleton'
import { useCompany } from '@/features/company/hooks/use-company'
import { useCompanyMutations } from '@/features/company/hooks/use-company-mutations'
import type { UpdateCompanyFormData } from '@/features/company/lib/company-schemas'
import { useCurrencies } from '@/features/admin/currencies/hooks/use-currencies'
import { toast } from 'sonner'

interface CompanyEditClientProps {
	id: number
}

/**
 * Client Component for Edit Company Page
 */
export function CompanyEditClient({ id }: CompanyEditClientProps) {
	const router = useRouter()
	const { state: companyState } = useCompany(id)
	const { updateCompany, updateState } = useCompanyMutations()
	const { currencies, isLoading: isLoadingCurrencies } = useCurrencies()

	const handleSubmit = useCallback(
		async (data: UpdateCompanyFormData) => {
			await updateCompany(id, {
				...data,
				idCurrency: data.idCurrency ? parseInt(data.idCurrency) : undefined,
			})
		},
		[updateCompany, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/admin/companies')
	}, [router])

	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Empresa actualizada exitosamente')
			router.push('/dashboard/admin/companies')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar empresa')
		}
	}, [updateState.status, updateState.error, router])

	if (companyState.status === 'loading' || isLoadingCurrencies) {
		return <EditCompanyFormSkeleton />
	}

	if (companyState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{companyState.error}</div>
				<button
					onClick={() => router.push('/dashboard/admin/companies')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (companyState.status === 'success') {
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

					<CompanyForm
						mode="edit"
						initialData={companyState.data}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isLoading={updateState.status === 'loading'}
						currencies={currencies}
					/>
				</div>
			</div>
		)
	}

	return null
}
