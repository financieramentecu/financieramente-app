'use client'

import React, { useState, useTransition, useCallback } from 'react'
import { SimuladorForm, type SimuladorFormData } from './simulador-form'
import { SimuladorResultados } from './simulador-resultados'
import {
	simulateCommission,
	SimulationResult,
} from '@/features/simulador/actions/simulate-commission'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { AlertCircle } from 'lucide-react'



interface SimuladorClientProps {
	companies: { idCompany: number; name: string; currency?: { symbol: string | null } | null }[]
	products: { idProduct: number; name: string; idCompany: number }[]
	origins: { idClientOrigin: number; name: string }[]
	levels: { idLevel: number; name: string; code?: string; idNextLevel?: number | null }[]
	userRole?: string
	userLevelId?: number | null
}

export function SimuladorClient({
	companies,
	products,
	origins,
	levels,
	userRole,
	userLevelId,
}: SimuladorClientProps) {
	const [isPending, startTransition] = useTransition()
	const [result, setResult] = useState<SimulationResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [submittedCurrency, setSubmittedCurrency] = useState<'USD' | 'COP'>('USD')

	const handleFormChange = useCallback((data: { distributionData?: { levelCode: string, levelName: string, porcentaje: number }[] }) => {
		// handle changes if needed
	}, [])

	const handleSimulate = (data: SimuladorFormData) => {
		setError(null)
		setSubmittedCurrency(data.currency)
		startTransition(async () => {
			try {
				const dataWithTrm = { ...data, trm: 1, idLevelView: data.idLevelView }
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const simResult = await simulateCommission(dataWithTrm as any)
				if (!simResult.success) {
					setError(simResult.error || 'Error desconocido al simular.')
					setResult(null)
				} else {
					setResult(simResult)
				}
			} catch {
				setError('Hubo un error de conexión al simular la comisión.')
				setResult(null)
			}
		})
	}

	const handleClear = () => {
		setResult(null)
		setError(null)
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
				<div className="flex flex-col gap-4">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<SimuladorForm
						companies={companies}
						products={products}
						origins={origins}
						levels={levels}
						userRole={userRole}
						userLevelId={userLevelId}
						onSubmit={handleSimulate}
						onClear={handleClear}
						onChange={handleFormChange}
						isPending={isPending}
					/>
				</div>

				<div className="flex flex-col">
					<SimuladorResultados
						result={result}
						isLoading={isPending}
						currency={submittedCurrency}
					/>
				</div>
			</div>

			<div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-sm text-slate-700">
				<h3 className="font-semibold text-slate-900 mb-2 text-base">Información sobre los cálculos y fórmulas</h3>
				<p>Para el cálculo de la comisión Crea Patrimonio, en el monto total de la venta coloca el APE (PRIMA MENSUAL POR 12).</p>
			</div>
		</div>
	)
}
