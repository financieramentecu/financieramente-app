'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'
import { formatTimeBogota } from '@/features/shared/lib/format-date'
import { groupTimelineByDay } from '@/features/leads/activities/group-timeline-by-day'
import { LeadTimelineSkeleton } from '@/features/leads/components/lead-loading-skeleton'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'
import { useActivityComments } from '@/features/leads/agenda/use-activity-comments'

/** Comment timeline for one task or one support case, same rail as the lead history. */
export function ActivityCommentThread({
	focus,
	onChanged,
}: {
	focus: ActivityFocus
	onChanged?: () => void
}) {
	const { state, saving, saveError, addComment } = useActivityComments(focus, true)
	const [body, setBody] = useState('')
	const comments = state.status === 'success' ? state.data : []
	const days = groupTimelineByDay(comments.map((comment) => ({ ...comment, occurredAt: comment.createdAt })))
	const error = state.status === 'error' ? state.error : saveError

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const saved = await addComment(body)
		if (!saved) return
		setBody('')
		onChanged?.()
	}

	return (
		<section aria-label="Comentarios" className="space-y-3">
			<form onSubmit={(event) => void submit(event)} className="space-y-2">
				<label htmlFor={`activity-comment-${focus.kind}-${focus.id}`} className="text-sm font-medium">
					Agregar comentario
				</label>
				<Textarea
					id={`activity-comment-${focus.kind}-${focus.id}`}
					value={body}
					onChange={(event) => setBody(event.target.value)}
					maxLength={2000}
					placeholder="Escribe un seguimiento"
					disabled={saving}
				/>
				<Button type="submit" size="sm" disabled={saving || !body.trim()}>
					{saving ? 'Guardando…' : 'Agregar comentario'}
				</Button>
			</form>
			{state.status === 'loading' && <LeadTimelineSkeleton label="Cargando comentarios…" />}
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			{state.status === 'success' && comments.length === 0 && (
				<p className="text-sm text-muted-foreground">Sin comentarios</p>
			)}
			{days.map((group) => (
				<div key={group.day} className="space-y-2">
					<h4 className="text-xs font-semibold text-muted-foreground">{group.label}</h4>
					<ol>
						{group.items.map((comment) => (
							<li
								key={comment.id}
								className="relative border-l border-slate-200 pb-4 pl-4 last:pb-1 dark:border-slate-700"
							>
								<span className="absolute -left-1.5 top-1 size-3 rounded-full bg-primary" aria-hidden />
								<p className="text-xs text-muted-foreground">
									{formatTimeBogota(comment.createdAt)} · {comment.authorName}
								</p>
								<p className="text-sm font-medium whitespace-pre-wrap text-foreground">{comment.body}</p>
							</li>
						))}
					</ol>
				</div>
			))}
		</section>
	)
}
