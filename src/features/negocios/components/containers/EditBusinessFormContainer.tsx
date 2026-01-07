'use client'

/**
 * Container para el formulario de edición de negocio
 * Reutiliza el BusinessForm en modo edición
 */

import { useRouter } from 'next/navigation'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { Separator } from '@/features/shared/ui/separator'
import { BusinessForm } from '../business-form'
import { businessEntityToFormData } from '../../mappers/business-form.mapper'
import type { BusinessEntity } from '../../types/business-entity.types'
import type { UserWithRole } from '../../types/business.types'
import type { Company } from '@prisma/client'

interface EditBusinessFormContainerProps {
	business: BusinessEntity
	currentUser: UserWithRole
	companies: Company[]
	products: {
		idProduct: number
		name: string
		idCompany: number
	}[]
	periodicities: {
		idBuyPeriodicity: number
		name: string
	}[]
	currencies: {
		idCurrency: number
		name: string
	}[]
	clientOrigins: {
		idClientOrigin: number
		name: string
	}[]
}

export function EditBusinessFormContainer({
	business,
	currentUser,
	companies,
	products,
	periodicities,
	currencies,
	clientOrigins,
}: EditBusinessFormContainerProps) {
	const router = useRouter()

	// Transformar opciones al formato esperado por el formulario
	const companiesOptions = companies.map((c) => ({
		value: String(c.idCompany),
		label: c.name,
	}))

	const productsOptions = products.map((p) => ({
		value: String(p.idProduct),
		label: p.name,
		companyId: String(p.idCompany),
	}))

	const periodicitiesOptions = periodicities.map((p) => ({
		value: String(p.idBuyPeriodicity),
		label: p.name,
	}))

	const currenciesOptions = currencies.map((c) => ({
		value: String(c.idCurrency),
		label: c.name,
	}))

	const clientOriginsOptions = clientOrigins.map((o) => ({
		value: String(o.idClientOrigin),
		label: o.name,
	}))

	// Convertir business entity a form data
	const defaultValues = businessEntityToFormData(business)

	const handleSubmit = async () => {
		// El submit se maneja internamente en useBusinessForm
		// Después de una actualización exitosa, redirigir a la lista
		router.push('/dashboard/negocios')
	}

	const handleCancel = () => {
		router.push('/dashboard/negocios')
	}

	return (
		<div className="space-y-6">
			<BusinessForm
				mode="edit"
				businessId={business.id}
				defaultValues={defaultValues}
				onSubmit={handleSubmit}
				onCancel={handleCancel}
				currentUser={currentUser}
				companiesOptions={companiesOptions}
				productsOptions={productsOptions}
				periodicitiesOptions={periodicitiesOptions}
				currenciesOptions={currenciesOptions}
				clientOriginsOptions={clientOriginsOptions}
				businessAgent={business.agent}
			/>
		</div>
	)
}

/**
 * Skeleton para carga del formulario de edición
 * Refleja la estructura exacta del BusinessForm
 */
export function EditBusinessFormSkeleton() {
	return (
		<div className="max-w-4xl mx-auto p-6 bg-white space-y-8">
			{/* Header skeleton */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
				{/* Logo skeleton */}
				<Skeleton className="h-9 w-36" />
				{/* Banner skeleton */}
				<div className="bg-[#00505C] w-full sm:w-auto px-4 sm:px-8 py-4 rounded-lg flex items-center gap-4 sm:gap-6">
					<Skeleton className="h-24 w-24 rounded-md bg-[#003d47] dark:bg-[#004a54]" />
					<div className="flex-1 flex flex-col gap-2">
						<Skeleton className="h-5 w-64 bg-[#6BCA6F] dark:bg-[#83D874]" />
						<Skeleton className="h-4 w-56 bg-[#6BCA6F] dark:bg-[#83D874]" />
					</div>
				</div>
			</div>

			{/* ClientInfoSection skeleton */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-64" />
					<Separator className="bg-gray-300" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					{/* No. Documento */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Email */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Apellidos */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Nombres */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Teléfono */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Origen del cliente */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Nro. Contrato */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>

			{/* ProductInfoSection skeleton */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-48" />
					<Separator className="bg-gray-300" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					{/* Compañía */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Producto */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Plazo */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>

			{/* BusinessInfoSection skeleton */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-48" />
					<Separator className="bg-gray-300" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					{/* Moneda */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Periodicidad */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Valor */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-10 w-full" />
					</div>
					{/* Agente */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>

			{/* FormActions skeleton */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-40" />
			</div>
		</div>
	)
}
