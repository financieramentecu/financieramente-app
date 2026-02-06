import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductConfigurationCreateClient } from '@/features/product-configuration/components/product-configuration-create-client'

/**
 * Create Product Configuration Page (Server Component)
 */
export default async function CreateProductConfigurationPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Crear Configuración de Producto">
			<ProductConfigurationCreateClient />
		</DashboardLayout>
	)
}
