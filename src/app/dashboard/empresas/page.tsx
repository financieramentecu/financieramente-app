import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EmpresasPageClient } from './empresas-page-client'

/**
 * Página de Listado de Empresas (Server Component)
 */
export default async function EmpresasPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Empresas">
			<EmpresasPageClient />
		</DashboardLayout>
	)
}
