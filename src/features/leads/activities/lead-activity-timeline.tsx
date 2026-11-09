'use client'

import { MessageSquareText } from 'lucide-react'
import { Separator } from '@/features/shared/ui/separator'
import { Button } from '@/features/shared/ui/button'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import { useLeadTimeline } from '@/features/leads/activities/use-lead-timeline'
import { LeadActivityForm } from '@/features/leads/activities/lead-activity-form'
import { describeTimelineEntry, timelineEntryKey } from '@/features/leads/activities/describe-timeline-entry'

export function LeadActivityTimeline({ leadId, enabled }: { leadId: number; enabled: boolean }) {
	const { state, loadingMore, loadMore, logActivity } = useLeadTimeline(leadId, enabled)
	if (!enabled) return null

	const items = state.status === 'success' ? state.data.items : []
	const hasMore = state.status === 'success' && state.data.nextCursor !== null

	return (
		<section aria-labelledby="lead-timeline-title" className="space-y-3">
			<div className="flex items-center gap-2">
				<MessageSquareText className="size-4 text-slate-500" aria-hidden />
				<h3 id="lead-timeline-title" className="text-sm font-semibold">Timeline</h3>
			</div>
			<LeadActivityForm leadId={leadId} onSubmit={logActivity} />
			{state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Cargando actividades…</p>}
			{state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
			{state.status === 'success' && items.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay actividades para este lead.</p>}
			{items.map((entry) => {
				const view = describeTimelineEntry(entry)
				return (
					<div key={timelineEntryKey(entry)} className="space-y-1 text-sm">
						<p className="font-medium">{view.title}{view.meta && <span className="ml-2 text-xs font-normal text-muted-foreground">{view.meta}</span>}</p>
						<p className="whitespace-pre-wrap text-foreground">{view.detail}</p>
						<p className="text-xs text-muted-foreground">{view.actor} · {formatDateTimeBogota(entry.occurredAt)}</p>
						<Separator className="mt-3" />
					</div>
				)
			})}
			{hasMore && (
				<Button type="button" variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
					{loadingMore ? 'Cargando…' : 'Cargar más'}
				</Button>
			)}
		</section>
	)
}
