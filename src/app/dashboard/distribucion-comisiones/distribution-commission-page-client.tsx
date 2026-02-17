'use client'

import { useProductConfigurations } from '@/features/product-configuration/hooks/use-product-configurations'
import { ProductConfigurationsTableSection } from '@/features/product-configuration/components/product-configurations-table'
import { Button } from '@/features/shared/ui/button'
import { RefreshCw } from 'lucide-react'

export function DistributionCommissionPageClient() {
	const {
		data: configurations,
		isLoading,
		error,
		reload: refetch,
		setSearch,
		pagination,
		setPage,
		filters,
		setActive,
	} = useProductConfigurations()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold tracking-tight">
					Distribución de Comisiones
				</h2>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => refetch()}
						title="Recargar"
					>
						<RefreshCw
							className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
						/>
					</Button>
				</div>
			</div>

			<div className="rounded-md border p-4">
				<p className="mb-4 text-sm text-muted-foreground">
					Seleccione una Configuración de Producto para gestionar sus reglas de
					comisión.
				</p>

				{error ? (
					<div className="flex flex-col items-center justify-center py-10 text-destructive">
						<p>Error al cargar las configuraciones</p>
						<Button
							variant="outline"
							onClick={() => refetch()}
							className="mt-4"
						>
							Reintentar
						</Button>
					</div>
				) : (
					<ProductConfigurationsTableSection
						data={configurations || []}
						onAddConfiguration={() => {}}
						onGlobalSearch={setSearch}
						onEditConfiguration={() => {}}
						onToggleActive={() => {}}
						pagination={pagination}
						onPageChange={setPage}
						isSearching={isLoading}
						selectedActive={filters.active}
						onActiveChange={setActive}
					/>
				)}
			</div>
		</div>
	)
}
