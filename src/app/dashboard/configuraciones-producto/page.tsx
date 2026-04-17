import { auth } from '@/auth'
import { headers } from 'next/headers'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductConfigurationsPageClient } from '@/features/product-configuration/components/product-configurations-page-client'
import { isE2ETestAuthAllowed } from '@/lib/auth/test-auth'

/**
 * Product Configurations List Page (Server Component)
 */
export default async function ProductConfigurationsPage() {
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = isE2ETestAuthAllowed((name) => headersList.get(name))
	} catch {
		// headers() not available
	}

	if (!isTestAuth) {
		const session = await auth()
		if (!session?.user) {
			return null
		}
	}

	return (
		<DashboardLayout currentPage="Configuración de Producto">
			<ProductConfigurationsPageClient />
		</DashboardLayout>
	)
}
