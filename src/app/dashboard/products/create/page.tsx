import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductCreateClient } from './product-create-client'
import { getCompanies } from '@/features/company/services/company.service'
import type { CompanyOption } from '@/features/product/types/product.types'

/**
 * Página de Creación de Producto (Server Component)
 */
export default async function CreateProductPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	// Obtener compañías en el servidor para mejor performance
	const companies = await getCompanies()
	const companyOptions: CompanyOption[] = companies.map((company) => ({
		idCompany: company.idCompany,
		name: company.name,
		status: company.status,
	}))

	return (
		<DashboardLayout currentPage="Nuevo Producto">
			<ProductCreateClient companies={companyOptions} />
		</DashboardLayout>
	)
}
