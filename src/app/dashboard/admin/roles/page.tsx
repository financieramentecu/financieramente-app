import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { RolesManager } from '@/features/access-control/components/roles-manager'

export default function AdminRolesPage() {
	return (
		<DashboardLayout currentPage="Roles">
			<RolesManager />
		</DashboardLayout>
	)
}
