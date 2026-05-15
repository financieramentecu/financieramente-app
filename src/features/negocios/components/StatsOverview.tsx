'use client'

import React from 'react'
import { CoachKpiCard } from './CoachKpiCard'
import { CoachKpiResponse } from '../types/business-api.types'
import { CheckCircle2, FileText, Landmark } from 'lucide-react'

interface StatsOverviewProps {
	stats: CoachKpiResponse | null
}

export function StatsOverview({ stats }: StatsOverviewProps) {
	if (!stats) return null

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
			<CoachKpiCard
				title="Ventas Efectuadas"
				icon={FileText}
				count={stats.ventasEfectuadas.count}
				valueLocal={stats.ventasEfectuadas.totalCop}
				valueForeign={stats.ventasEfectuadas.totalUsd}
				colorScheme="orange"
			/>
			<CoachKpiCard
				title="Emitidos"
				icon={CheckCircle2}
				count={stats.emitidos.count}
				valueLocal={stats.emitidos.totalCop}
				valueForeign={stats.emitidos.totalUsd}
				colorScheme="emerald"
				sinSoporte={stats.emitidos.sinSoporte}
			/>
			<CoachKpiCard
				title="Fondeados"
				icon={Landmark}
				count={stats.fondeados.count}
				valueLocal={stats.fondeados.totalCop}
				valueForeign={stats.fondeados.totalUsd}
				colorScheme="indigo"
			/>
		</div>
	)
}
