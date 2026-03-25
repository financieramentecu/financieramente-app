import { Metadata } from 'next'
import { Suspense } from 'react'
import { CategoryTypesTable } from '@/features/category-types/components/category-types-table'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'

export const metadata: Metadata = {
    title: 'Tipos de Categoría | Administración',
    description: 'Administrar los tipos de categoría del sistema',
}

export default function CategoryTypesPage() {
	return (
		<DashboardLayout currentPage="Tipos de Categoría">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Tipos de Categoría
						</h1>
						<p className="text-muted-foreground">
							Gestione los tipos de categoría disponibles (ej. MMS, Aliado) que se
							pueden asignar a las categorías.
						</p>
					</div>
				</div>

				<Suspense
					fallback={
						<div className="rounded-lg border border-[#DDE9EB] bg-white p-6 text-sm text-[#529398]">
							Cargando tipos de categoría...
						</div>
					}
				>
					<CategoryTypesTable />
				</Suspense>
			</div>
		</DashboardLayout>
	)
}
