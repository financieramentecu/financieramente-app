import React from 'react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { prisma } from '@/lib/prisma'
import { FunnelColumnsAdminTable } from '@/features/leads/components/funnel-columns-admin-table'
import { LeadCsvImportPanel } from '@/features/leads/components/lead-csv-import-panel'

// Reads the database directly; the dashboard layout no longer calls auth(), so without
// this Next.js would prerender the page at build time (no DATABASE_URL in the image build).
export const dynamic = 'force-dynamic'

export default async function LeadFunnelColumnsAdminPage() {
	const columns = await prisma.leadFunnelColumn.findMany({
		where: { active: true },
		orderBy: { position: 'asc' },
	})

	return (
		<DashboardLayout currentPage="Columnas de Leads">
			<div className="space-y-6">
				<h1 className="text-2xl font-semibold">Columnas del embudo de Leads</h1>
				<LeadCsvImportPanel />
				<FunnelColumnsAdminTable initialColumns={columns} />
			</div>
		</DashboardLayout>
	)
}
