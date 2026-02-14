'use client'

import { useParams } from 'next/navigation'
import { CommissionRuleForm } from '@/features/commission-rules/components/commission-rule-form'
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
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Crear Regla de Comisión
				</h2>
				<p className="text-muted-foreground">
					Define una nueva regla para la distribución de comisiones.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Detalles de la Regla</CardTitle>
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
	)
}
