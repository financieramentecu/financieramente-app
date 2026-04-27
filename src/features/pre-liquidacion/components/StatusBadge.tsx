'use client'

import React from 'react'

/**
 * Reusable badge for commission and file import statuses.
 */
export function StatusBadge({ status }: { status: string }) {
	const config: Record<
		string,
		{ label: string; className: string; dot: string }
	> = {
		SYNCHRONIZED: {
			label: 'Sincronizado',
			className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
			dot: 'bg-blue-500',
		},
		'PRE-SETTLED': {
			label: 'Pre-liquidado',
			className: 'bg-amber-50 text-amber-700 ring-amber-600/20',
			dot: 'bg-amber-500',
		},
		SETTLED: {
			label: 'Liquidado',
			className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
			dot: 'bg-emerald-500',
		},
		LAG: {
			label: 'Rezagado',
			className: 'bg-rose-50 text-rose-700 ring-rose-600/20',
			dot: 'bg-rose-500',
		},
		COMPLETED: {
			label: 'Completado',
			className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
			dot: 'bg-indigo-500',
		},
		LOAD: {
			label: 'Cargado',
			className: 'bg-slate-50 text-slate-700 ring-slate-600/20',
			dot: 'bg-slate-500',
		},
	}

	const { label, className, dot } = config[status] || {
		label: status,
		className: 'bg-muted text-muted-foreground ring-border',
		dot: 'bg-muted-foreground/40',
	}

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
			{label}
		</span>
	)
}
