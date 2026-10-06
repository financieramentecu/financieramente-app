'use client'

import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { DefaultDistributionEditor } from '@/features/distribution-commission/components/default-distribution-editor'

export default function DefaultDistributionPage() {
	return (
		<DashboardLayout currentPage="Administración">
			<div className="space-y-5">
				<div className="flex flex-col gap-1">
					<h1 className="text-lg font-semibold">Distribución por defecto</h1>
					<p className="text-sm text-muted-foreground">
						Porcentajes que se copian al crear un producto
					</p>
				</div>
				<DefaultDistributionEditor />
			</div>
		</DashboardLayout>
	)
}
