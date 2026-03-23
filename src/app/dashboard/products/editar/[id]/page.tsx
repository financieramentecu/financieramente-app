import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductEditClient } from './product-edit-client'
import { notFound } from 'next/navigation'
import { getCompanies } from '@/features/company/lib/company-api'
import type { CompanyOption } from '@/features/product/types/product.types'

interface EditProductPageProps {
	params: Promise<{ id: string }>
}

/**
 * Página de Edición de Producto (Server Component)
 */
export default async function EditProductPage({
	params,
}: EditProductPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const productId = parseInt(id)

	if (Number.isNaN(productId)) {
		notFound()
	}

	// Obtener compañías en el servidor para mejor performance
	const companies = await getCompanies()
	const companyOptions: CompanyOption[] = companies.map((company) => ({
		idCompany: company.idCompany,
		name: company.name,
		status: company.status,
	}))

	return (
		<DashboardLayout currentPage="Editar Producto">
			<ProductEditClient id={productId} companies={companyOptions} />
		</DashboardLayout>
	)
}
