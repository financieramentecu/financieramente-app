'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import type { SimulationResult } from '@/features/calculadora/actions/calculate-commission'
import { formatCurrency } from '@/features/admin/currencies/lib/currency-formatters'

interface CalculadoraResultadosProps {
	result: SimulationResult | null
	isLoading: boolean
	currency: 'USD' | 'COP'
}

export function CalculadoraResultados({
	result,
	isLoading,
	currency,
}: CalculadoraResultadosProps) {

	if (isLoading) {
		return (
			<div className="space-y-6 animate-pulse">
				{/* Resumen Global skeleton */}
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex-1 flex flex-col gap-2">
						<div className="h-3 w-36 bg-slate-200 rounded" />
						<div className="h-8 w-48 bg-slate-300 rounded" />
					</div>
				</div>

				{/* Desglose tabla skeleton */}
				<div className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
					<div className="bg-white px-6 py-4 border-b border-gray-100">
						<div className="h-4 w-52 bg-slate-200 rounded" />
					</div>
					<div className="px-6 pb-6 pt-4 space-y-0">
						{/* Header row */}
						<div className="bg-slate-100 rounded-t-md flex gap-4 px-4 py-2.5 mb-1">
							<div className="h-3 w-40 bg-slate-300 rounded" />
							<div className="h-3 w-8 bg-slate-300 rounded ml-auto" />
							<div className="h-3 w-20 bg-slate-300 rounded" />
						</div>
						{/* Body rows */}
						{[1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
								<div className="h-3 bg-slate-200 rounded" style={{ width: `${50 + (i * 7) % 25}%` }} />
								<div className="h-3 w-10 bg-slate-200 rounded ml-auto" />
								<div className="h-3 w-20 bg-slate-200 rounded" />
							</div>
						))}
					</div>
				</div>

				{/* Descuentos & Clawback skeleton */}
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-orange-50 border border-orange-100 rounded-xl px-5 py-4 flex flex-col gap-2 h-[80px]">
						<div className="h-3 w-28 bg-orange-200 rounded" />
						<div className="h-6 w-24 bg-orange-200 rounded" />
					</div>
					<div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex flex-col gap-2 h-[80px]">
						<div className="h-3 w-20 bg-red-200 rounded" />
						<div className="h-6 w-24 bg-red-200 rounded" />
					</div>
				</div>

				{/* Comisión Estimada skeleton */}
				<div className="bg-teal-50 border border-teal-100 rounded-xl px-6 py-5 flex items-center justify-between">
					<div className="h-4 w-40 bg-teal-200 rounded" />
					<div className="h-9 w-36 bg-teal-300 rounded" />
				</div>
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
			{/* Resumen Global */}
			<div className="flex flex-col sm:flex-row gap-4 justify-between">
				<div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 flex-1 flex flex-col justify-center">
					<p className="text-sm text-slate-500 mb-1 font-medium">Total comision recibida</p>
					<div className="flex items-baseline gap-2">
						<p className="text-2xl font-bold text-slate-800">
							{formatCurrency(result.comisionTotalBruta, currency)}
						</p>
					</div>
				</div>
			</div>

			{/* Desglose */}
			<Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
				<CardHeader className="bg-white pb-3 pt-5 px-6 flex flex-row items-center justify-between">
					<CardTitle className="text-sm font-semibold text-gray-800">
						Desglose por Jerarquía de usuario
					</CardTitle>
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
										%
									</th>
									<th className="py-2.5 px-4 font-semibold rounded-tr-md">
										Monto
									</th>
								</tr>
							</thead>
							<tbody>
								{result.desglose.map((item) => {
									const isSeller = item.levelCode === result.sellerLevelCode
									const isUserLevel = item.levelCode === result.userOwnLevelCode
									const isViewLevel = item.levelCode === result.viewLevelCode
									
									let rowBg = ''
									let textColor = 'text-gray-600'
									let amountColor = 'text-[#0D5B69]'
									let label = null

									if (isSeller) {
										rowBg = 'bg-blue-50 border-l-4 border-l-blue-400'
										textColor = 'text-blue-700'
										amountColor = 'text-blue-700'
										label = <span className="ml-2 text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Vendió</span>
									} else if (isViewLevel) {
										rowBg = 'bg-indigo-50 border-l-4 border-l-indigo-400'
										textColor = 'text-indigo-700'
										amountColor = 'text-indigo-700'
										label = <span className="ml-2 text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">Nivel a Visualizar</span>
									} else if (isUserLevel) {
										rowBg = 'bg-teal-50 border-l-4 border-l-teal-400'
										textColor = 'text-teal-700'
										amountColor = 'text-teal-700'
										label = <span className="ml-2 text-[10px] font-semibold bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full">Mi nivel</span>
									}

									return (
										<tr
											key={item.levelCode}
											className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${rowBg}`}
										>
											<td className="py-3 px-4 font-medium">
												<span className={textColor}>
													{item.levelName}
												</span>
												{label}
											</td>
											<td className={`py-3 px-4 ${textColor === 'text-gray-600' ? 'text-gray-600' : textColor}`}>
												{item.porcentaje.toFixed(2)}%
											</td>
											<td className={`py-3 px-4 font-medium ${amountColor}`}>
												{formatCurrency(item.monto, currency)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>

			{/* Clawback y Lead Bonus */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="bg-[#FFF4ED] border border-[#FFE2D1] rounded-xl px-5 py-4 flex flex-col justify-between items-start h-[80px] flex-1">
					<span className="text-sm font-medium text-[#B85C20]">
						Clawback del Usuario
					</span>
					<span className="text-xl font-bold text-[#B85C20]">
						{formatCurrency(result.totalClawback, currency)}
					</span>
				</div>

				{result.leadBonus > 0 && (
					<div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex flex-col justify-between items-start h-[80px] flex-1">
						<span className="text-sm font-medium text-emerald-700">
							Comisión por fuente de leads (2%)
						</span>
						<span className="text-xl font-bold text-emerald-700">
							{formatCurrency(result.leadBonus, currency)}
						</span>
					</div>
				)}
			</div>

			{/* Tu Comisión Estimada */}
			<div className="bg-[#E5F9F6] border border-[#BAEBE3] rounded-xl px-6 py-5 flex items-center justify-between">
				<span className="text-base font-semibold text-[#0D5B69]">
					Tu Comisión Estimada
				</span>
				<span className="text-3xl font-bold text-[#0D5B69]">
					{formatCurrency(result.comisionNetaEstimada, currency)}
				</span>
			</div>
		</div>
	)
}
