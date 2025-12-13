import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { getCompanies } from '@/services/company.service'
import { unstable_cache } from 'next/cache'
import BusinessWrapper from '@/features/negocios/components/business-wrapper'
import { getProducts } from '@/services/product.service'
import { getPeriodicities } from '@/services/periodicity.service'
import { getCurrencies } from '@/services/currency.service'

const getCompaniesCached = unstable_cache(getCompanies, ['companies'], {
	revalidate: 300, // 5 minutes
})

const getProductsCached = unstable_cache(getProducts, ['products'], {
	revalidate: 300, // 5 minutes
})

const getPeriodicitiesCached = unstable_cache(
	getPeriodicities,
	['periodicities'],
	{
		revalidate: 300, // 5 minutes
	}
)

const getCurrenciesCached = unstable_cache(getCurrencies, ['currencies'], {
	revalidate: 300, // 5 minutes
})

export default async function CrearNegocioPage() {
	const [companies, products, periodicities, currencies] = await Promise.all([
		getCompaniesCached(),
		getProductsCached(),
		getPeriodicitiesCached(),
		getCurrenciesCached(),
	])

	return (
		<DashboardLayout currentPage="Crear Negocio">
			<div className="space-y-6">
				<BusinessWrapper
					companies={companies}
					products={products}
					periodicities={periodicities}
					currencies={currencies}
				/>
			</div>
		</DashboardLayout>
	)
}
