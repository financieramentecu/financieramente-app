import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { RoleEditor } from '@/features/access-control/components/role-editor'

export default async function AdminRoleEditorPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	if (!/^\d+$/.test(id)) notFound()
	return (
		<DashboardLayout currentPage="Roles">
			<RoleEditor roleId={Number(id)} />
		</DashboardLayout>
	)
}
