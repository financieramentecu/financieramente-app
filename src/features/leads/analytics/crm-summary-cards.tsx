'use client'

import { useEffect, useState } from 'react'
import {
	AlertCircle,
	BriefcaseBusiness,
	ClipboardCheck,
	Headphones,
	Link2,
} from 'lucide-react'
import { EMPTY_CRM_SUMMARY, type CrmSummary } from './crm-summary.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { LeadBoardFilters } from '@/features/leads/lib/lead-board-filters'
import { serializeLeadBoardFilters } from '@/features/leads/lib/lead-board-query'

interface CrmSummaryCardsProps {
	enabled: boolean
	paused?: boolean
	filters?: LeadBoardFilters
	refreshKey?: number
	onAssociatedOnlyChange?: (selected: boolean) => void
}

/** Aggregate metrics follow pipeline context without narrowing when the association toggle is active. */
export function CrmSummaryCards({
	enabled,
	paused = false,
	filters,
	refreshKey = 0,
	onAssociatedOnlyChange,
}: CrmSummaryCardsProps) {
	const [state, setState] = useState<AsyncState<CrmSummary>>({
		status: 'idle',
		data: undefined,
		error: '',
	})
	const query = serializeLeadBoardFilters(
		filters ? { ...filters, associatedOnly: false } : undefined
	)
	useEffect(() => {
		if (!enabled || paused) return
		let active = true
		setState({ status: 'loading', data: undefined, error: '' })
		void fetch(`/api/crm/reports/summary${query}`)
			.then(async (response) => {
				const body = (await response.json()) as ApiResponse<CrmSummary>
				if (!response.ok || !body.data)
					throw new Error('No fue posible cargar el resumen CRM')
				if (active) setState({ status: 'success', data: body.data, error: '' })
			})
			.catch(() => {
				if (active)
					setState({
						status: 'error',
						data: undefined,
						error: 'No fue posible cargar el resumen CRM.',
					})
			})
		return () => {
			active = false
		}
	}, [enabled, paused, query, refreshKey])

	if (!enabled || paused) return null
	if (state.status === 'loading')
		return (
			<p role="status" className="text-sm text-muted-foreground">
				Cargando resumen CRM…
			</p>
		)
	if (state.status === 'error')
		return (
			<p role="alert" className="text-sm text-destructive">
				{state.error}
			</p>
		)
	const summary = state.status === 'success' ? state.data : EMPTY_CRM_SUMMARY
	const cards = [
		{
			label: 'Oportunidades activas',
			value: summary.opportunities,
			detail: 'Cada grupo relacionado cuenta una vez',
			icon: BriefcaseBusiness,
		},
		{
			label: 'Oportunidades asociadas',
			value: summary.associatedOpportunities,
			detail: 'Leads relacionados',
			icon: Link2,
		},
		{
			label: 'Tareas abiertas',
			value: summary.openTasks,
			detail: summary.overdueTasks
				? `${summary.overdueTasks} vencidas`
				: undefined,
			warning: true,
			icon: ClipboardCheck,
		},
		{
			label: 'Casos abiertos',
			value: summary.openCases,
			detail: summary.overdueCases
				? `${summary.overdueCases} vencidos`
				: undefined,
			warning: true,
			icon: Headphones,
		},
	]
	return (
		<section
			aria-label="Resumen CRM"
			className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
		>
			{cards.map(({ label, value, detail, warning, icon: Icon }) => {
				const associated = label === 'Oportunidades asociadas'
				const content = (
					<>
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm text-muted-foreground">{label}</p>
							<Icon className="size-4 text-muted-foreground" aria-hidden />
						</div>
						<p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
						{detail && (
							<p
								className={`mt-1 flex items-center gap-1 text-xs ${warning ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}
							>
								{warning ? (
									<AlertCircle className="size-3" aria-hidden />
								) : null}
								{detail}
							</p>
						)}
					</>
				)
				return associated ? (
					<button
						key={label}
						type="button"
						aria-label={label}
						aria-pressed={filters?.associatedOnly === true}
						onClick={() => onAssociatedOnlyChange?.(!filters?.associatedOnly)}
						disabled={!onAssociatedOnlyChange}
						className="rounded-lg border border-border bg-card p-4 text-left shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
					>
						{content}
					</button>
				) : (
					<article
						key={label}
						className="rounded-lg border border-border bg-card p-4 shadow-sm"
					>
						{content}
					</article>
				)
			})}
		</section>
	)
}
