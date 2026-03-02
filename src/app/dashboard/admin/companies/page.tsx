import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CompaniesPageClient } from './companies-page-client'

/**
 * Companies List Page (Server Component)
 */
export default async function CompaniesPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Empresas">
			<CompaniesPageClient />
		</DashboardLayout>
	)
}
