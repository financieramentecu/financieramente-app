'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { BusinessForm } from '@/features/negocios/components/business-form'
import { toast } from 'sonner'
import type {
	Company,
	Currency,
	BuyPeriodicity,
	Product,
	ClientOrigin,
} from '@prisma/client'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { UserWithRole } from '../types/business.types'
import { useGetAllData } from '../hooks/use-get-all-data'

interface Props {
	companies: Company[]
	products: Product[]
	periodicities: BuyPeriodicity[]
	currencies: Currency[]
	clientOrigins: ClientOrigin[]
	currentUser: UserWithRole | null
	/** Prefill from a lead conversion (leads-crm-sync feature) */
	defaultValues?: Partial<BusinessFormData>
	/** Present when opened from a lead conversion; forwarded to createBusiness */
	leadId?: number
}

export default function BusinessWrapper({
	currentUser,
	defaultValues,
	leadId,
	...props
}: Props) {
	const router = useRouter()
	const {
		companiesOptions,
		productsOptions,
		periodicitiesOptions,
		currenciesOptions,
		clientOriginsOptions,
	} = useGetAllData(props)
	const handleSubmit = async () => {
		try {
			toast.success('Negocio creado exitosamente', {
				description: 'El negocio ha sido registrado correctamente.',
			})

			// Redirigir a la lista de negocios después de crear
			router.push('/dashboard/negocios')
		} catch (error) {
			console.error('Error al crear negocio:', error)
			toast.error('Error al crear negocio', {
				description:
					'Ocurrió un error al intentar crear el negocio. Por favor, intenta de nuevo.',
			})
		}
	}

	const handleCancel = () => {
		router.push('/dashboard/negocios')
	}

	return (
		<div className="space-y-6">
			<BusinessForm
				onSubmit={handleSubmit}
				onCancel={handleCancel}
				currentUser={currentUser}
				companiesOptions={companiesOptions}
				productsOptions={productsOptions}
				periodicitiesOptions={periodicitiesOptions}
				currenciesOptions={currenciesOptions}
				clientOriginsOptions={clientOriginsOptions}
				defaultValues={defaultValues}
				leadId={leadId}
			/>
		</div>
	)
}

