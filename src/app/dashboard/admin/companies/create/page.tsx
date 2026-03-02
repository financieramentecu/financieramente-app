import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CompanyCreateClient } from './company-create-client'

/**
 * Create Company Page (Server Component)
 */
export default async function CreateCompanyPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Nueva Empresa">
			<CompanyCreateClient />
		</DashboardLayout>
	)
}
