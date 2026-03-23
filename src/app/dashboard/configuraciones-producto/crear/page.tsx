import { auth } from '@/auth'
import { headers } from 'next/headers'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductConfigurationCreateClient } from '@/features/product-configuration/components/product-configuration-create-client'

/**
 * Create Product Configuration Page (Server Component)
 */
export default async function CreateProductConfigurationPage() {
	let isTestAuth = false
	try {
		const headersList = await headers()
		isTestAuth = headersList.get('x-test-auth') === 'true'
	} catch {
		// headers() not available
	}

	if (!(process.env.NODE_ENV !== 'production' && isTestAuth)) {
		const session = await auth()
		if (!session?.user) {
			return null
		}
	}

	return (
		<DashboardLayout currentPage="Crear Configuración de Producto">
			<ProductConfigurationCreateClient />
		</DashboardLayout>
	)
}
