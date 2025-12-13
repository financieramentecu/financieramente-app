'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessForm } from '@/features/negocios/components/business-form'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { toast } from 'sonner'
import { Company, Currency, BuyPeriodicity, Product } from '@prisma/client'

interface BusinessWrapperProps {
	companies: Company[]
	products: Product[]
	periodicities: BuyPeriodicity[]
	currencies: Currency[]
}

export default function BusinessWrapper({
	companies,
	products,
	periodicities,
	currencies,
}: BusinessWrapperProps) {
	const router = useRouter()
	const handleSubmit = async (data: BusinessFormData) => {
		try {
			// TODO: Implementar llamada a API para crear negocio
			console.log('Datos del formulario:', data)

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

	const companiesOptions = useMemo(
		() =>
			companies.map((company) => ({
				value: company.idCompany.toString(),
				label: company.name,
			})),
		[companies]
	)

	const productsOptions = useMemo(
		() =>
			products.map((product) => ({
				value: product.idProduct.toString(),
				label: product.name,
				companyId: product.idCompany.toString(),
			})),
		[products]
	)

	const periodicitiesOptions = useMemo(
		() =>
			periodicities.map((periodicity) => ({
				value: periodicity.idBuyPeriodicity.toString(),
				label: periodicity.name,
			})),
		[periodicities]
	)

	const currenciesOptions = useMemo(
		() =>
			currencies.map((currency) => ({
				value: currency.idCurrency.toString(),
				label: currency.name,
			})),
		[currencies]
	)
	return (
		<BusinessForm
			onSubmit={handleSubmit}
			onCancel={handleCancel}
			companiesOptions={companiesOptions}
			productsOptions={productsOptions}
			periodicitiesOptions={periodicitiesOptions}
			currenciesOptions={currenciesOptions}
		/>
	)
}
