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
import type { AgentInfo } from '../types/business-entity.types'

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
	/**
	 * The lead's owner, when opened from a lead conversion and the lead has
	 * one assigned. Locks and defaults the `agent` (Money Strategist) field.
	 */
	businessAgent?: AgentInfo
}

export default function BusinessWrapper({
	currentUser,
	defaultValues,
	leadId,
	businessAgent,
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
				businessAgent={businessAgent}
			/>
		</div>
	)
}

