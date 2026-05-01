import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductsPageClient } from './products-page-client'
import { getCompanies } from '@/features/company/lib/company-api'

/**
 * Página de Listado de Productos (Server Component)
 */
export default async function ProductsPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	// Obtener compañias activas en el server component para mejor rendimiento
	const companies = await getCompanies()

	// Mapear al formato esperado por el componente
	const companiesFormatted = companies.map((company) => ({
		idCompany: company.idCompany,
		name: company.name,
		status: company.status,
	}))

	return (
		<DashboardLayout currentPage="Productos">
			<ProductsPageClient companies={companiesFormatted} />
		</DashboardLayout>
	)
}
