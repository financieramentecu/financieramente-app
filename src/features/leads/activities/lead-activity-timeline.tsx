'use client'

import { MessageSquareText } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { LeadTimelineSkeleton } from '@/features/leads/components/lead-loading-skeleton'
import { formatTimeBogota } from '@/features/shared/lib/format-date'
import { groupTimelineByDay } from '@/features/leads/activities/group-timeline-by-day'
import { useLeadTimeline } from '@/features/leads/activities/use-lead-timeline'
import { LeadActivityForm } from '@/features/leads/activities/lead-activity-form'
import { ActivityAttachments } from '@/features/leads/activities/activity-attachments'
import {
	describeTimelineEntry,
	timelineEntryKey,
} from '@/features/leads/activities/describe-timeline-entry'

export function LeadActivityTimeline({
	leadId,
	enabled,
}: {
	leadId: number
	enabled: boolean
}) {
	const { state, loadingMore, loadMore, logActivity } = useLeadTimeline(
		leadId,
		enabled
	)
	if (!enabled) return null

	const items = state.status === 'success' ? state.data.items : []
	const days = groupTimelineByDay(items)
	const hasMore = state.status === 'success' && state.data.nextCursor !== null

	return (
		<section aria-labelledby="lead-timeline-title" className="space-y-3">
			<div className="flex items-center gap-2">
				<MessageSquareText className="size-4 text-slate-500" aria-hidden />
				<h3 id="lead-timeline-title" className="text-sm font-semibold">
					Línea de tiempo
				</h3>
			</div>
			<LeadActivityForm leadId={leadId} onSubmit={logActivity} />
			{state.status === 'loading' && <LeadTimelineSkeleton label="Cargando la línea de tiempo…" />}
			{state.status === 'error' && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}
			{state.status === 'success' && items.length === 0 && (
				<p className="text-sm text-muted-foreground">
					Aún no hay actividades, tareas ni cambios de etapa para este lead.
				</p>
			)}
			{days.map((group) => (
				<div key={group.day} className="space-y-2">
					<h4 className="text-xs font-semibold text-muted-foreground">
						{group.label}
					</h4>
					<ol>
						{group.items.map((entry) => {
							const view = describeTimelineEntry(entry)
							return (
								<li
									key={timelineEntryKey(entry)}
									className="relative border-l border-slate-200 pb-4 pl-4 last:pb-1 dark:border-slate-700"
								>
									<span
										className="absolute -left-1.5 top-1 size-3 rounded-full bg-primary"
										aria-hidden
									/>
									<p className="text-xs text-muted-foreground">
										{formatTimeBogota(entry.occurredAt)} · {view.actor}
										{view.meta ? ` · ${view.meta}` : ''}
									</p>
									<p className="text-sm font-medium">{view.title}</p>
									<p className="text-sm whitespace-pre-wrap text-foreground">
										{view.detail}
									</p>
									{entry.kind !== 'stage_change' && (
										<ActivityAttachments leadId={leadId} entry={entry} />
									)}
								</li>
							)
						})}
					</ol>
				</div>
			))}
			{hasMore && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void loadMore()}
					disabled={loadingMore}
				>
					{loadingMore ? 'Cargando…' : 'Cargar más'}
				</Button>
			)}
		</section>
	)
}
