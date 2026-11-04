import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { PartnersManager } from '@/features/admin/partners/components/partners-manager'

export default function AdminPartnersPage() {
	return (
		<DashboardLayout currentPage="Partners">
			<PartnersManager />
		</DashboardLayout>
	)
}
