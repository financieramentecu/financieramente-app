import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EmpresaCreateClient } from './empresa-create-client'

/**
 * Página de Creación de Empresa (Server Component)
 */
export default async function CreateEmpresaPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Nueva Empresa">
			<EmpresaCreateClient />
		</DashboardLayout>
	)
}
