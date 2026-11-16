import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { RoleEditor } from '@/features/access-control/components/role-editor'
import { requirePagePermission } from '@/features/access-control/services/require-page-permission'

export default async function AdminRoleEditorPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	await requirePagePermission('roles.ver')
	const { id } = await params
	if (!/^\d+$/.test(id)) notFound()
	// No breadcrumb here: the editor bar already shows the role name and a back
	// link to the list, so the breadcrumb would only repeat both.
	return (
		<DashboardLayout currentPage="Roles" breadcrumbs={[]}>
			<RoleEditor roleId={Number(id)} />
		</DashboardLayout>
	)
}
