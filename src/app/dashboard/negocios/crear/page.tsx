import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { getCompanies } from '@/features/company/lib/company-api'
import { unstable_cache } from 'next/cache'
import BusinessWrapper from '@/features/negocios/components/business-wrapper'
import { getProducts } from '@/features/product/lib/product-api'
import { getPeriodicities } from '@/features/admin/periodicities/lib/periodicity-api'
import { getCurrencies } from '@/features/admin/currencies/lib/currency-api'
import { getClientOrigins } from '@/features/origins/lib/origins-api'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { CurrentUser } from '@/features/negocios/types/business.types'

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

const getClientOriginsCached = unstable_cache(
	getClientOrigins,
	['clientOrigins'],
	{
		revalidate: 300, // 5 minutes
	}
)

export default async function CrearNegocioPage() {
	const [
		companies,
		products,
		periodicities,
		currencies,
		clientOrigins,
		session,
	] = await Promise.all([
		getCompaniesCached(),
		getProductsCached(),
		getPeriodicitiesCached(),
		getCurrenciesCached(),
		getClientOriginsCached(),
		auth(),
	])

	// Obtener información completa del usuario desde la base de datos
	let currentUser: CurrentUser | null = null

	if (session?.user?.email) {
		currentUser = await getCurrentUserByEmail(session.user.email)
	}

	return (
		<DashboardLayout currentPage="Crear Negocio">
			<div className="space-y-6">
				<BusinessWrapper
					companies={companies}
					products={products}
					periodicities={periodicities}
					currencies={currencies}
					clientOrigins={clientOrigins}
					currentUser={currentUser}
				/>
			</div>
		</DashboardLayout>
	)
}
