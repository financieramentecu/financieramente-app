'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCommissionRules } from '@/features/distribution-commission/hooks/use-commission-rules'
import { CommissionRulesTable } from '@/features/distribution-commission/components/commission-rules-table'
import { Button } from '@/features/shared/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '@/features/shared/ui/card'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { useProductConfiguration } from '@/features/product-configuration/hooks/use-product-configuration'

export default function CommissionRulesPage() {
	const params = useParams()
	const router = useRouter()
	const productConfigId = Number(params.id)

	const { data, isLoading, isError, error, setSearch, reload } =
		useCommissionRules(productConfigId)

	const { state: productConfigState } = useProductConfiguration(productConfigId)

	if (isNaN(productConfigId)) {
		return <div>ID de configuración inválido</div>
	}

	return (
		<DashboardLayout currentPage="Distribución de comisión">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							Distribución de comisión
						</h2>
						<p className="text-muted-foreground">
							{productConfigState.status === 'success' &&
							productConfigState.data?.code
								? `Código producto: ${productConfigState.data.code}`
								: 'Administra las distribuciones de comisiones para este producto.'}
						</p>
					</div>
					<Button
						disabled={data.some((r) => r.active)}
						onClick={() => {
							if (data.some((r) => r.active)) {
								toast.error('Acción bloqueada', {
									description:
										'Ya existe una distribución activa. Desactívala antes de crear una nueva.',
								})
								return
							}
							router.push(
								`/dashboard/distribucion-comisiones/${productConfigId}/reglas/crear`
							)
						}}
					>
						<Plus className="mr-2 h-4 w-4" />
						Nueva Distribución
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardDescription>
							Listado de distribuciones de comisión activas e inactivas.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{isLoading ? (
							<div className="flex h-24 items-center justify-center">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : isError ? (
							<div className="flex h-24 items-center justify-center text-destructive">
								Error: {error}
							</div>
						) : (
							<CommissionRulesTable
								data={data}
								productConfigId={productConfigId}
								onAssignmentSuccess={reload}
								onSearchChange={setSearch}
								searchPlaceholder="Buscar por descripción..."
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
