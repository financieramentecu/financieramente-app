'use client'

import React from 'react'
import { Card } from '@/features/shared/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type KpiColorScheme = 'orange' | 'emerald' | 'indigo'

const COLOR_SCHEME: Record<
	KpiColorScheme,
	{ border: string; title: string; icon: string; header: string; badge: string }
> = {
	orange: {
		border: 'border-l-4 border-l-orange-400',
		title: 'text-orange-700 dark:text-orange-400',
		icon: 'text-orange-500',
		header: 'bg-orange-50/60 dark:bg-orange-950/20',
		badge:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	},
	emerald: {
		border: 'border-l-4 border-l-emerald-400',
		title: 'text-emerald-700 dark:text-emerald-400',
		icon: 'text-emerald-500',
		header: 'bg-emerald-50/60 dark:bg-emerald-950/20',
		badge:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	},
	indigo: {
		border: 'border-l-4 border-l-indigo-400',
		title: 'text-indigo-700 dark:text-indigo-400',
		icon: 'text-indigo-500',
		header: 'bg-indigo-50/60 dark:bg-indigo-950/20',
		badge:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	},
}

interface CoachKpiCardProps {
	title: string
	icon: LucideIcon
	count: number
	valueLocal: number
	valueForeign: number
	colorScheme?: KpiColorScheme
	sinSoporte?: number
}

export function CoachKpiCard({
	title,
	icon: Icon,
	count,
	valueLocal,
	valueForeign,
	colorScheme = 'indigo',
	sinSoporte,
}: CoachKpiCardProps) {
	const scheme = COLOR_SCHEME[colorScheme]

	const fmt = (val: number, currency: string) =>
		new Intl.NumberFormat('es-CO', {
			style: 'currency',
			currency,
			maximumFractionDigits: 0,
		}).format(typeof val === 'number' && isFinite(val) ? val : 0)

	return (
		<Card
			className={cn(
				'overflow-hidden transition-all hover:shadow-md',
				scheme.border
			)}
		>
			{/* Header — flush with top border, no margin */}
			<div className={cn('flex items-center gap-2 px-4 py-2', scheme.header)}>
				<Icon className={cn('h-4 w-4 shrink-0', scheme.icon)} />
				<span
					className={cn(
						'text-xs font-semibold uppercase tracking-wide',
						scheme.title
					)}
				>
					{title}
				</span>
			</div>

			{/* Body */}
			<div className="flex flex-col gap-3 px-4 py-3">
				{/* Count */}
				<div className="flex items-baseline gap-1.5 flex-wrap">
					<span className="text-2xl font-bold tracking-tighter">{count}</span>
					<span className="text-[10px] font-medium text-muted-foreground uppercase">
						Negocios
					</span>
					{sinSoporte !== undefined && sinSoporte > 0 && (
						<span
							className={cn(
								'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
								scheme.badge
							)}
						>
							{sinSoporte} sin soporte de pago
						</span>
					)}
				</div>

				{/* Values */}
				<div className="grid grid-cols-2 gap-4 pt-2 border-t border-muted/50">
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
							Local
						</p>
						<p className="text-sm font-bold text-foreground whitespace-nowrap">
							{fmt(valueLocal, 'COP')}
						</p>
					</div>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
							Extranjera
						</p>
						<p className="text-sm font-bold text-primary whitespace-nowrap">
							{fmt(valueForeign, 'USD')}
						</p>
					</div>
				</div>
			</div>
		</Card>
	)
}
