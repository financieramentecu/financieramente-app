import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { RoleEditor } from '@/features/access-control/components/role-editor'
import { getRoleName } from '@/features/access-control/services/role-query.service'

export default async function AdminRoleEditorPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	if (!/^\d+$/.test(id)) notFound()
	const roleName = await getRoleName(prisma, Number(id))
	const breadcrumbs = [
		{ label: 'Administración' },
		{ label: 'Roles', href: '/dashboard/admin/roles' },
		{ label: roleName ?? id },
	]
	return (
		<DashboardLayout currentPage="Roles" breadcrumbs={breadcrumbs}>
			<RoleEditor roleId={Number(id)} />
		</DashboardLayout>
	)
}
