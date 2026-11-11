'use client'

import { History } from 'lucide-react'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'
import { useLeadStageStays } from '@/features/leads/hooks/use-lead-stage-stays'

export function LeadStageHistory({
	leadId,
	enabled,
}: {
	leadId: number
	enabled: boolean
}) {
	const { state } = useLeadStageStays(leadId, enabled)
	if (!enabled) return null

	const stays = state.status === 'success' ? state.data : []

	return (
		<section aria-labelledby="lead-stage-history-title" className="space-y-3">
			<div className="flex items-center gap-2">
				<History className="size-4 text-slate-500" aria-hidden />
				<h3 id="lead-stage-history-title" className="text-sm font-semibold">
					Tiempo en cada etapa
				</h3>
			</div>
			{state.status === 'loading' && (
				<p role="status" className="text-sm text-muted-foreground">
					Cargando historial…
				</p>
			)}
			{state.status === 'error' && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.status === 'success' && stays.length === 0 && (
				<p className="text-sm text-muted-foreground">
					Este lead aún no tiene historial de etapas.
				</p>
			)}
			<ol className="space-y-0">
				{stays.map((stay) => (
					<li
						key={`${stay.columnName}-${stay.enteredAt}`}
						className="relative border-l border-slate-200 pb-4 pl-4 last:pb-0 dark:border-slate-700"
					>
						<span
							className="absolute -left-1.5 top-1 size-3 rounded-full bg-primary"
							aria-hidden
						/>
						<p className="text-sm font-medium">{stay.columnName}</p>
						<p className="text-xs text-muted-foreground">
							{formatDateTimeBogota(stay.enteredAt)}
							{stay.current
								? ' · En curso'
								: ` → ${formatDateTimeBogota(stay.leftAt)}`}
						</p>
						<p className="text-sm text-foreground">
							{formatStageDuration(stay.durationMs)}
						</p>
					</li>
				))}
			</ol>
		</section>
	)
}
