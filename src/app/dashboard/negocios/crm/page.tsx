import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CrmTabs } from '@/features/leads/components/crm-tabs'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getRolePermissions } from '@/features/auth/lib/permissions'

export default async function CrmPage() {
	const session = await auth()

	// Partner allowlist admits /dashboard/negocios/*, so the page itself must
	// enforce leads access (role permissions are re-derived, not read from JWT).
	if (!getRolePermissions(session?.user?.role)?.leads) {
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
				<CrmTabs />
			</div>
		</DashboardLayout>
	)
}
