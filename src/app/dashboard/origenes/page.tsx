import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { OrigenesPageClient } from './origenes-page-client'

/**
 * Página de Listado de Orígenes de Cliente (Server Component)
 */
export default async function OrigenesPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Orígenes de Cliente">
			<OrigenesPageClient />
		</DashboardLayout>
	)
}
