import React from 'react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { getCompanies } from '@/features/company/services/company.service'
import { unstable_cache } from 'next/cache'
import BusinessWrapper from '@/features/negocios/components/business-wrapper'
import { getProducts } from '@/features/product/services/product.service'
import { getPeriodicities } from '@/features/admin/periodicities/services/periodicity.service'
import { getCurrencies } from '@/features/admin/currencies/services/currency.service'
import { getClientOrigins } from '@/features/origins/services/origins.service'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { CurrentUser } from '@/features/negocios/types/business.types'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { getLeadForConversion } from '@/features/leads/services/lead-conversion.service'
import { mapLeadToBusinessDefaults } from '@/features/leads/mappers/lead-to-business-defaults'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

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

interface CrearNegocioPageProps {
	searchParams: Promise<{ leadId?: string }>
}

export default async function CrearNegocioPage({
	searchParams,
}: CrearNegocioPageProps) {
	const [
		companies,
		products,
		periodicities,
		currencies,
		clientOrigins,
		session,
		resolvedSearchParams,
	] = await Promise.all([
		getCompaniesCached(),
		getProductsCached(),
		getPeriodicitiesCached(),
		getCurrenciesCached(),
		getClientOriginsCached(),
		auth(),
		searchParams,
	])

	// Obtener información completa del usuario desde la base de datos
	let currentUser: CurrentUser | null = null
	if (session?.user?.email) {
		currentUser = await getCurrentUserByEmail(session.user.email)
	}

	// Lead conversion prefill (leads-crm-sync feature): ?leadId=<id>
	let leadId: number | undefined
	let leadDefaultValues: Partial<BusinessFormData> | undefined

	const rawLeadId = resolvedSearchParams.leadId
	if (rawLeadId && currentUser) {
		const parsedLeadId = parseInt(rawLeadId, 10)
		if (!Number.isNaN(parsedLeadId)) {
			const visibleUserIds = isHierarchyBypassRole(currentUser.role?.code)
				? []
				: await getAccessibleUserIds(currentUser.idUser)

			const lead = await getLeadForConversion(parsedLeadId, currentUser, {
				visibleUserIds,
			})

			// Not found, out of the viewer's hierarchy, or already converted
			// (getLeadForConversion excludes all three cases): redirect to the
			// same page without ?leadId, falling back to a blank creation form.
			if (lead) {
				leadId = lead.idLead
				leadDefaultValues = mapLeadToBusinessDefaults(lead)
			} else {
				redirect('/dashboard/negocios/crear')
			}
		}
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
					defaultValues={leadDefaultValues}
					leadId={leadId}
				/>
			</div>
		</DashboardLayout>
	)
}
