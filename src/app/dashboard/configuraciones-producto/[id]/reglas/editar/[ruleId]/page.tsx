'use client'

import { useParams } from 'next/navigation'
import { CommissionRuleForm } from '@/features/commission-rules/components/commission-rule-form'
import { CommissionRuleFormSkeleton } from '@/features/commission-rules/components/commission-rule-form-skeleton'
import { useCommissionRule } from '@/features/commission-rules/hooks/use-commission-rule'
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

	const { data: rule, isLoading, isError, error } = useCommissionRule(
		productConfigId,
		ruleId
	)

	if (isNaN(productConfigId) || isNaN(ruleId)) {
		return <div>IDs inválidos</div>
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Editar Regla de Comisión
					</h2>
					<p className="text-muted-foreground">
						Modifica los detalles y porcentajes de la regla de comisión.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Editar Regla</CardTitle>
						<CardDescription>
							Actualiza la información de la regla seleccionada.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CommissionRuleFormSkeleton />
					</CardContent>
				</Card>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex h-screen items-center justify-center text-destructive">
				Error: {error}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Editar Regla de Comisión
				</h2>
				<p className="text-muted-foreground">
					Modifica los detalles y porcentajes de la regla de comisión.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Editar Regla</CardTitle>
					<CardDescription>
						Actualiza la información de la regla seleccionada.
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
	)
}
