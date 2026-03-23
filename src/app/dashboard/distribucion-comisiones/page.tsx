import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { DistributionCommissionPageClient } from './distribution-commission-page-client'

export default async function DistributionCommissionPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Distribución de Comisiones">
			<DistributionCommissionPageClient />
		</DashboardLayout>
	)
}
