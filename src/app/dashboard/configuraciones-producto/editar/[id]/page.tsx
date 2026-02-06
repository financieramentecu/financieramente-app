import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ProductConfigurationEditClient } from '@/features/product-configuration/components/product-configuration-edit-client'
import { notFound } from 'next/navigation'

interface EditProductConfigurationPageProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Product Configuration Page (Server Component)
 */
export default async function EditProductConfigurationPage({
	params,
}: EditProductConfigurationPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const configId = parseInt(id)

	if (Number.isNaN(configId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Configuración de Producto">
			<ProductConfigurationEditClient id={configId} />
		</DashboardLayout>
	)
}
