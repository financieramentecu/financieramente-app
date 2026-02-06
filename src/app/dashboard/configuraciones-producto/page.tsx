import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductConfigurationsPageClient } from '@/features/product-configuration/components/product-configurations-page-client'

/**
 * Product Configurations List Page (Server Component)
 */
export default async function ProductConfigurationsPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Configuración de Producto">
			<ProductConfigurationsPageClient />
		</DashboardLayout>
	)
}
