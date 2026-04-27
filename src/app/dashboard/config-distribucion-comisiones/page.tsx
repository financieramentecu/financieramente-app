import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ConfigDistribucionEntryClient } from '@/features/distribution-commission/components/config-distribucion-entry-client'

export default async function ConfigDistribucionComisionesPage() {
	const session = await auth()
	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Config. distribución de comisiones">
			<ConfigDistribucionEntryClient />
		</DashboardLayout>
	)
}
