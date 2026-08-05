import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LeadsBoard } from '@/features/leads/components/leads-board'

export default async function LeadsPage() {
	return (
		<DashboardLayout currentPage="Leads" breadcrumbs={[]}>
			<div className="space-y-6">
				<LeadsBoard />
			</div>
		</DashboardLayout>
	)
}
