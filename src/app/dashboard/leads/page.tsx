import React from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LeadsBoard } from '@/features/leads/components/leads-board'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'

export default async function LeadsPage() {
	const session = await auth()

	const isEnabled = await isFeatureEnabledServer('leads_module', session?.user?.email ?? undefined)
	if (!isEnabled) {
		redirect('/dashboard')
	}

	return (
		<DashboardLayout currentPage="Leads" breadcrumbs={[]}>
			<div className="space-y-6">
				<LeadsBoard />
			</div>
		</DashboardLayout>
	)
}
