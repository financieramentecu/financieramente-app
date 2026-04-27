'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type KpiColorScheme = 'orange' | 'emerald' | 'indigo'

const COLOR_SCHEME: Record<
	KpiColorScheme,
	{ border: string; title: string; icon: string; header: string }
> = {
	orange: {
		border: 'border-orange-200 border-l-4 border-l-orange-400',
		title: 'text-orange-700 dark:text-orange-400',
		icon: 'text-orange-500',
		header: 'bg-orange-50/60 dark:bg-orange-950/20',
	},
	emerald: {
		border: 'border-emerald-200 border-l-4 border-l-emerald-400',
		title: 'text-emerald-700 dark:text-emerald-400',
		icon: 'text-emerald-500',
		header: 'bg-emerald-50/60 dark:bg-emerald-950/20',
	},
	indigo: {
		border: 'border-indigo-200 border-l-4 border-l-indigo-400',
		title: 'text-indigo-700 dark:text-indigo-400',
		icon: 'text-indigo-500',
		header: 'bg-indigo-50/60 dark:bg-indigo-950/20',
	},
}

interface CoachKpiCardProps {
	title: string
	icon: LucideIcon
	count: number
	valueLocal: number
	valueForeign: number
	colorScheme?: KpiColorScheme
}

/**
 * Componente de KPI diseñado para el dashboard del Coach (Data-Dense).
 * Muestra simultáneamente cantidad, moneda local y moneda extranjera.
 */
export function CoachKpiCard({
	title,
	icon: Icon,
	count,
	valueLocal,
	valueForeign,
	colorScheme = 'indigo',
}: CoachKpiCardProps) {
	const scheme = COLOR_SCHEME[colorScheme]

	const formatCurrency = (val: number, currency: string) => {
		const safe = typeof val === 'number' && isFinite(val) ? val : 0
		return new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency,
			maximumFractionDigits: 0,
		}).format(safe)
	}

	return (
		<Card className={cn('overflow-hidden transition-all hover:shadow-md', scheme.border)}>
			<CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-2', scheme.header)}>
				<CardTitle className={cn('text-sm font-semibold tracking-tight uppercase', scheme.title)}>
					{title}
				</CardTitle>
				<Icon className={cn('h-4 w-4 opacity-80', scheme.icon)} />
			</CardHeader>
			<CardContent className="pt-4">
				<div className="flex flex-col gap-3">
					{/* Contador Principal */}
					<div className="flex items-baseline gap-2">
						<span className="text-3xl font-bold tracking-tighter">
							{count}
						</span>
						<span className="text-xs font-medium text-muted-foreground uppercase">
							Negocios
						</span>
					</div>

					{/* Valores por Moneda - Estructura Densa */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-muted/50 mt-1">
						<div className="space-y-1">
							<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
								Moneda Local
							</p>
							<p className="text-sm font-bold text-foreground">
								{formatCurrency(valueLocal, 'COP')}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
								Moneda Extranjera
							</p>
							<p className="text-sm font-bold text-primary">
								{formatCurrency(valueForeign, 'USD')}
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
