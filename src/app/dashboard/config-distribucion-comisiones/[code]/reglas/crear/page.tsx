'use client'

import { useParams } from 'next/navigation'
import { CommissionRuleForm } from '@/features/distribution-commission/components/commission-rule-form'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { useProductConfigurationByCode } from '@/features/product-configuration/hooks/use-product-configuration-by-code'
import { ConfigurationDistributionStepper } from '@/features/product-configuration/components/configuration-distribution-stepper'
import { useDistributionWizardFormMode } from '@/features/distribution-commission/hooks/use-distribution-wizard-form-mode'
import { Loader2 } from 'lucide-react'

export default function CreateCommissionRuleByCodePage() {
	const params = useParams()
	const code = typeof params.code === 'string' ? params.code : ''
	const resolveState = useProductConfigurationByCode(code)
	const productConfigId =
		resolveState.status === 'success' ? resolveState.data.id : undefined
	const formModeState = useDistributionWizardFormMode(productConfigId)

	if (resolveState.status === 'loading') {
		return (
			<div className="space-y-6">
				<ConfigurationDistributionStepper currentStep={2} />
				<div className="flex h-40 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		)
	}

	if (resolveState.status === 'error') {
		return (
			<div className="space-y-6">
				<ConfigurationDistributionStepper currentStep={2} />
				<p className="text-destructive">{resolveState.error}</p>
			</div>
		)
	}

	if (resolveState.status !== 'success') {
		return null
	}

	if (formModeState.status === 'loading') {
		return (
			<div className="space-y-6">
				<ConfigurationDistributionStepper currentStep={2} />
				<div className="flex h-40 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		)
	}

	if (formModeState.status === 'error') {
		return (
			<div className="space-y-6">
				<ConfigurationDistributionStepper currentStep={2} />
				<p className="text-destructive">{formModeState.error}</p>
			</div>
		)
	}

	if (formModeState.status !== 'success') {
		return null
	}

	const { id, code: resolvedCode } = resolveState.data
	const distributionBasePath = `/dashboard/config-distribucion-comisiones/${encodeURIComponent(resolvedCode)}`
	const { mode: formMode, initialRule } = formModeState.data

	return (
		<div className="space-y-6">
			<ConfigurationDistributionStepper currentStep={2} />
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Crear Distribución de Comisión
				</h2>
				<p className="text-muted-foreground">
					Define una nueva distribución de comisiones (código: {resolvedCode}).
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Detalles de la Distribución</CardTitle>
					<CardDescription>
						Ingresa la descripción y asigna los porcentajes por nivel.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CommissionRuleForm
						productConfigId={id}
						configLevelCode={resolveState.data.level.code}
						distributionBasePath={distributionBasePath}
						mode={formMode}
						initialData={initialRule}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
