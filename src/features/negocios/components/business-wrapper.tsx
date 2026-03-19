'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { BusinessForm } from '@/features/negocios/components/business-form'
import { PiggyBank } from 'lucide-react'
import { toast } from 'sonner'
import {
	Company,
	Currency,
	BuyPeriodicity,
	Product,
	ClientOrigin,
} from '@prisma/client'
import { UserWithRole } from '../types/business.types'
import { useGetAllData } from '../hooks/use-get-all-data'

interface Props {
	companies: Company[]
	products: Product[]
	periodicities: BuyPeriodicity[]
	currencies: Currency[]
	clientOrigins: ClientOrigin[]
	currentUser: UserWithRole | null
	clawbackBalance: number
}

export default function BusinessWrapper({
	currentUser,
	clawbackBalance = 0,
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
			<div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-lg text-white transition-all hover:scale-[1.02] hover:shadow-amber-500/25 border border-white/10">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium text-white/80">
							Reserva de Clawback
						</p>
						<p className="text-3xl font-bold tracking-tight">
							$
							{clawbackBalance.toLocaleString('es-CO', {
								maximumFractionDigits: 0,
							})}
						</p>
					</div>
					<div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
						<PiggyBank className="h-6 w-6 text-white" />
					</div>
				</div>
			</div>

			<BusinessForm
				onSubmit={handleSubmit}
				onCancel={handleCancel}
				currentUser={currentUser}
				companiesOptions={companiesOptions}
				productsOptions={productsOptions}
				periodicitiesOptions={periodicitiesOptions}
				currenciesOptions={currenciesOptions}
				clientOriginsOptions={clientOriginsOptions}
			/>
		</div>
	)
}

