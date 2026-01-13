import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { OriginCreateClient } from './origin-create-client'

/**
 * Página de Creación de Origen de Cliente (Server Component)
 */
export default async function CreateOriginPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Nuevo Origen de Cliente">
			<OriginCreateClient />
		</DashboardLayout>
	)
}

