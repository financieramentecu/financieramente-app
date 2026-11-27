import React, { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CrmTabs } from '@/features/leads/components/crm-tabs'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { roleCan } from '@/features/access-control/services/role-permission-check'

export default async function CrmPage() {
	const session = await auth()

	// Partner allowlist admits /dashboard/negocios/*, so the page itself must
	// enforce CRM access (permissions are re-derived from the role, not read from JWT).
	const role = session?.user?.role
	const viewer = session?.user
	const [canManage, canViewLeads] = await Promise.all([
		roleCan(role, 'leads.gestionar'),
		roleCan(role, 'leads.ver'),
	])
	const granted =
		!!viewer && 'canViewOthersCrm' in viewer && viewer.canViewOthersCrm === true && canViewLeads
	if (!canManage && !granted) {
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
