import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { RolesManager } from '@/features/access-control/components/roles-manager'
import { requirePagePermission } from '@/features/access-control/services/require-page-permission'

export default async function AdminRolesPage() {
	await requirePagePermission('roles.ver')
	return (
		<DashboardLayout currentPage="Roles">
			<RolesManager />
		</DashboardLayout>
	)
}
