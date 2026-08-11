'use client'

import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { ReportPermissionsAdmin } from '@/features/report-permissions/components/report-permissions-admin'
import { REPORT_PERMISSIONS_UI } from '@/features/report-permissions/lib/report-permissions-helpers'

export default function ReportPermissionsAdminPage() {
	return (
		<DashboardLayout currentPage="Administración">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">
						{REPORT_PERMISSIONS_UI.PAGE_TITLE}
					</h1>
					<p className="text-muted-foreground mt-2">
						Configura qué categorías de usuario pueden ver cada reporte
					</p>
				</div>
				<ReportPermissionsAdmin />
			</div>
		</DashboardLayout>
	)
}
