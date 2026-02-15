'use client'

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CommissionRuleForm } from '@/features/distribution-commission/components/commission-rule-form'
import { CommissionRuleFormSkeleton } from '@/features/distribution-commission/components/commission-rule-form-skeleton'
import { useCommissionRule } from '@/features/distribution-commission/hooks/use-commission-rule'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'

export default function EditCommissionRulePage() {
	const params = useParams()
	const productConfigId = Number(params.id)
	const ruleId = Number(params.ruleId)

	const {
		data: rule,
		isLoading,
		isError,
		error,
	} = useCommissionRule(productConfigId, ruleId)

	if (isNaN(productConfigId) || isNaN(ruleId)) {
		return <div>IDs inválidos</div>
	}

	if (isLoading) {
		return (
			<DashboardLayout currentPage="Editar Distribución de Comisión">
				<div className="space-y-6">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							Editar Distribución de Comisión
						</h2>
						<p className="text-muted-foreground">
							Modifica los detalles y porcentajes de la distribución de
							comisión.
						</p>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Editar Distribución</CardTitle>
							<CardDescription>
								Actualiza la información de la distribución seleccionada.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<CommissionRuleFormSkeleton />
						</CardContent>
					</Card>
				</div>
			</DashboardLayout>
		)
	}

	if (isError) {
		return (
			<DashboardLayout currentPage="Editar Distribución de Comisión">
				<div className="flex h-screen items-center justify-center text-destructive">
					Error: {error}
				</div>
			</DashboardLayout>
		)
	}

	return (
		<DashboardLayout currentPage="Editar Distribución de Comisión">
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Editar Distribución de Comisión
					</h2>
					<p className="text-muted-foreground">
						Modifica los detalles y porcentajes de la distribución de comisión.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Editar Distribución</CardTitle>
						<CardDescription>
							Actualiza la información de la distribución seleccionada.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{rule && (
							<CommissionRuleForm
								productConfigId={productConfigId}
								initialData={rule}
								mode="edit"
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
