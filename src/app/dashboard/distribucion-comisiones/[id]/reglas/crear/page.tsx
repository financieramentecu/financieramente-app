'use client'

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CommissionRuleForm } from '@/features/distribution-commission/components/commission-rule-form'
import { useDistributionWizardFormMode } from '@/features/distribution-commission/hooks/use-distribution-wizard-form-mode'
import { Loader2 } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'

export default function CreateCommissionRulePage() {
	const params = useParams()
	const productConfigId = Number(params.id)
	const formModeState = useDistributionWizardFormMode(
		Number.isFinite(productConfigId) ? productConfigId : undefined
	)

	if (!Number.isFinite(productConfigId)) {
		return <div>ID de configuración inválido</div>
	}

	if (formModeState.status === 'loading') {
		return (
			<DashboardLayout currentPage="Crear Distribución de Comisión">
				<div className="flex h-40 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</DashboardLayout>
		)
	}

	if (formModeState.status === 'error') {
		return (
			<DashboardLayout currentPage="Crear Distribución de Comisión">
				<p className="text-destructive">{formModeState.error}</p>
			</DashboardLayout>
		)
	}

	if (formModeState.status !== 'success') {
		return null
	}

	const { mode: formMode, initialRule } = formModeState.data

	return (
		<DashboardLayout currentPage="Crear Distribución de Comisión">
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Crear Distribución de Comisión
					</h2>
					<p className="text-muted-foreground">
						Define una nueva distribución de comisiones.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Detalles de la Distribución</CardTitle>
						<CardDescription>
							Ingresa la descripción y asigna los porcentajes por categoría.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CommissionRuleForm
							productConfigId={productConfigId}
							mode={formMode}
							initialData={initialRule}
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
