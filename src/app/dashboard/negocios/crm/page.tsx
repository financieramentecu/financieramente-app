import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CrmTabs } from '@/features/leads/components/crm-tabs'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getRolePermissions } from '@/features/auth/lib/permissions'
import { UserRole } from '@/features/auth/lib/roles'

export default async function CrmPage() {
	const session = await auth()

	// Partner allowlist admits /dashboard/negocios/*, so the page itself must
	// enforce leads access (role permissions are re-derived, not read from JWT).
	const role = session?.user?.role
	const viewer = session?.user
	const granted =
		!!viewer &&
		'canViewOthersCrm' in viewer &&
		viewer.canViewOthersCrm === true &&
		role !== UserRole.PARTNER &&
		role !== UserRole.DEFAULT
	if (!getRolePermissions(role)?.leads && !granted) {
		redirect('/dashboard/negocios')
	}

	const isEnabled = await isFeatureEnabledServer(
		'leads_module',
		session?.user?.email ?? undefined
	)
	if (!isEnabled) {
		redirect('/dashboard')
	}

	return (
		<DashboardLayout currentPage="CRM" breadcrumbs={[]}>
			<div className="space-y-6">
				<Suspense fallback={null}>
					<CrmTabs />
				</Suspense>
			</div>
		</DashboardLayout>
	)
}
