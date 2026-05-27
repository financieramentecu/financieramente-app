'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import type { SimulationResult } from '@/features/simulador/actions/simulate-commission'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'
import { Badge } from '@/features/shared/ui/badge'

interface SimuladorResultadosProps {
	result: SimulationResult | null
	isLoading: boolean
}

export function SimuladorResultados({
	result,
	isLoading,
}: SimuladorResultadosProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64 border rounded-xl bg-card/50">
				<p className="text-muted-foreground animate-pulse">Calculando...</p>
			</div>
		)
	}

	if (!result) {
		return (
			<div className="flex items-center justify-center h-64 border rounded-xl bg-card/50 border-dashed">
				<p className="text-muted-foreground">
					Llena el formulario y haz clic en calcular para ver los resultados.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Caja de TRM */}
			<div className="flex justify-end">
				<div className="bg-[#EEF4F9] border border-[#DEEAF3] rounded-lg p-4 min-w-[200px]">
					<p className="text-sm text-[#004A74] mb-1 font-medium">TRM Base (TR)</p>
					<p className="text-xl font-bold text-[#004A74]">
						{formatCurrency(result.trmAplicada, 'COP')}
					</p>
				</div>
			</div>

			{/* Desglose */}
			<Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
				<CardHeader className="bg-white pb-3 pt-5 px-6 flex flex-row items-center justify-between">
					<CardTitle className="text-sm font-semibold text-gray-800">
						Desglose por Jerarquía de usuario
					</CardTitle>
					<Badge
						variant="secondary"
						className="bg-green-100 text-green-700 hover:bg-green-100 font-normal rounded-full"
					>
						Puntos calculados: 0
					</Badge>
				</CardHeader>
				<CardContent className="px-6 pb-6">
					<div className="w-full overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead className="bg-[#EAEFF4] text-gray-700 rounded-t-md">
								<tr>
									<th className="py-2.5 px-4 font-semibold rounded-tl-md">
										Venta Reportada Por
									</th>
									<th className="py-2.5 px-4 font-semibold">
										Tu %
									</th>
									<th className="py-2.5 px-4 font-semibold">
										Tu Monto
									</th>
									<th className="py-2.5 px-4 font-semibold">
										% MIA
									</th>
									<th className="py-2.5 px-4 font-semibold rounded-tr-md">
										Monto MIA
									</th>
								</tr>
							</thead>
							<tbody>
								{result.desglose.map((item) => (
									<tr
										key={item.levelCode}
										className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
									>
										<td className="py-3 px-4 text-gray-600 font-medium">
											{item.levelName}
										</td>
										<td className="py-3 px-4 text-gray-600">
											{item.porcentaje.toFixed(2)}%
										</td>
										<td className="py-3 px-4 font-medium text-[#0D5B69]">
											{formatCurrency(item.monto, 'COP')}
										</td>
										<td className="py-3 px-4 text-gray-600">
											{Number(item.error || 0).toFixed(2)}%
										</td>
										<td className="py-3 px-4 font-medium text-gray-700">
											{formatCurrency(item.puntos, 'COP')}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Descuentos & Clawback */}
			<div className="grid grid-cols-2 gap-4">
				<div className="bg-[#FFF4ED] border border-[#FFE2D1] rounded-xl px-5 py-4 flex flex-col justify-between items-start h-[80px]">
					<span className="text-sm font-medium text-[#B85C20]">
						Clawback del Usuario
					</span>
					<span className="text-xl font-bold text-[#B85C20]">
						{formatCurrency(result.totalClawback, 'COP')}
					</span>
				</div>
				<div className="bg-[#FFF0F0] border border-[#FFD6D6] rounded-xl px-5 py-4 flex flex-col justify-between items-start h-[80px]">
					<span className="text-sm font-medium text-[#C92A2A]">
						Descuento
					</span>
					<span className="text-xl font-bold text-[#C92A2A]">
						{formatCurrency(result.totalDescuento, 'COP')}
					</span>
				</div>
			</div>

			{/* Tu Comisión Estimada */}
			<div className="bg-[#E5F9F6] border border-[#BAEBE3] rounded-xl px-6 py-5 flex items-center justify-between">
				<span className="text-base font-semibold text-[#0D5B69]">
					Tu Comisión Estimada
				</span>
				<span className="text-3xl font-bold text-[#0D5B69]">
					{formatCurrency(result.comisionNetaEstimada, 'COP')}
				</span>
			</div>
		</div>
	)
}
