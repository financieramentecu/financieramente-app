'use client'

import { useParams } from 'next/navigation'
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
import { useProductConfigurationByCode } from '@/features/product-configuration/hooks/use-product-configuration-by-code'
import { Loader2 } from 'lucide-react'

function EditRuleBody({
	productConfigId,
	ruleId,
	distributionBasePath,
}: {
	productConfigId: number
	ruleId: number
	distributionBasePath: string
}) {
	const {
		data: rule,
		isLoading,
		isError,
		error,
	} = useCommissionRule(productConfigId, ruleId)

	if (isLoading) {
		return (
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
						distributionBasePath={distributionBasePath}
						initialData={rule}
						mode="edit"
					/>
				)}
			</CardContent>
		</Card>
	)
}

export default function EditCommissionRuleByCodePage() {
	const params = useParams()
	const code = typeof params.code === 'string' ? params.code : ''
	const ruleId = Number(params.ruleId)

	const resolveState = useProductConfigurationByCode(code)

	if (resolveState.status === 'loading') {
		return (
			<div className="flex h-40 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (resolveState.status === 'error') {
		return <p className="text-destructive">{resolveState.error}</p>
	}

	if (isNaN(ruleId)) {
		return <div>ID de regla inválido</div>
	}

	if (resolveState.status !== 'success') {
		return null
	}

	const { id, code: resolvedCode } = resolveState.data
	const distributionBasePath = `/dashboard/config-distribucion-comisiones/${encodeURIComponent(resolvedCode)}`

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Editar Distribución de Comisión
				</h2>
				<p className="text-muted-foreground">
					Modifica los detalles y porcentajes (código: {resolvedCode}).
				</p>
			</div>

			<EditRuleBody
				productConfigId={id}
				ruleId={ruleId}
				distributionBasePath={distributionBasePath}
			/>
		</div>
	)
}
