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
import { useProductConfigurationByCode } from '@/features/product-configuration/hooks/use-product-configuration-by-code'
import { Loader2 } from 'lucide-react'

export default function CreateCommissionRuleByCodePage() {
	const params = useParams()
	const code = typeof params.code === 'string' ? params.code : ''
	const resolveState = useProductConfigurationByCode(code)

	if (resolveState.status === 'loading') {
		return (
			<DashboardLayout currentPage="Crear Distribución de Comisión">
				<div className="flex h-40 items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</DashboardLayout>
		)
	}

	if (resolveState.status === 'error') {
		return (
			<DashboardLayout currentPage="Crear Distribución de Comisión">
				<p className="text-destructive">{resolveState.error}</p>
			</DashboardLayout>
		)
	}

	if (resolveState.status !== 'success') {
		return null
	}

	const { id, code: resolvedCode } = resolveState.data
	const distributionBasePath = `/dashboard/config-distribucion-comisiones/${encodeURIComponent(resolvedCode)}`

	return (
		<DashboardLayout currentPage="Crear Distribución de Comisión">
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Crear Distribución de Comisión
					</h2>
					<p className="text-muted-foreground">
						Define una nueva distribución de comisiones (código:{' '}
						{resolvedCode}).
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
							productConfigId={id}
							distributionBasePath={distributionBasePath}
							mode="create"
						/>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	)
}
