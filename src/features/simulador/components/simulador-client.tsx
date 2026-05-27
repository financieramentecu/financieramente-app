'use client'

import React, { useState, useTransition } from 'react'
import { SimuladorForm, type SimuladorFormData } from './simulador-form'
import { SimuladorResultados } from './simulador-resultados'
import {
	simulateCommission,
	SimulationResult,
} from '@/features/simulador/actions/simulate-commission'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { AlertCircle } from 'lucide-react'



interface SimuladorClientProps {
	companies: { idCompany: number; name: string }[]
	products: { idProduct: number; name: string; idCompany: number }[]
	origins: { idClientOrigin: number; name: string }[]
	levels: { idLevel: number; name: string }[]
}

export function SimuladorClient({
	companies,
	products,
	origins,
	levels,
}: SimuladorClientProps) {
	const [isPending, startTransition] = useTransition()
	const [result, setResult] = useState<SimulationResult | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSimulate = (data: SimuladorFormData) => {
		setError(null)
		startTransition(async () => {
			try {
				const simResult = await simulateCommission(data)
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
					onSubmit={handleSimulate}
					onClear={handleClear}
					isPending={isPending}
				/>
			</div>

			<div className="flex flex-col">
				<SimuladorResultados
					result={result}
					isLoading={isPending}
				/>
			</div>
		</div>
	)
}
