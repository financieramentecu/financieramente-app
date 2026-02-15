'use client'

import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CommissionRuleForm } from '@/features/distribution-commission/components/commission-rule-form'
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

	if (isNaN(productConfigId)) {
		return <div>ID de configuración inválido</div>
	}

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
							mode="create"
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
