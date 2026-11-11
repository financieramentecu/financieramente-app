'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'
import { formatDateTimeBogota } from '@/features/shared/lib/format-date'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'
import { completeActivity } from '@/features/leads/agenda/agenda-api'

interface ActivityComment {
	id: number
	body: string
	createdAt: string
	authorName: string
}

/** Comments and completion for one task or case, opened from the activities board. */
export function ActivityWorkPanel({
	focus,
	title,
	canComplete,
	onClose,
	onChanged,
}: {
	focus: ActivityFocus
	title: string
	canComplete: boolean
	onClose: () => void
	onChanged: () => void
}) {
	const [comments, setComments] = useState<ActivityComment[]>([])
	const [body, setBody] = useState('')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		setError(null)
		fetch(`/api/crm/activity-comments?kind=${focus.kind}&id=${focus.id}`)
			.then(async (response) => {
				if (!response.ok) throw new Error('comments')
				const payload = (await response.json()) as ApiResponse<ActivityComment[]>
				if (!cancelled) setComments(payload.data ?? [])
			})
			.catch(() => {
				if (!cancelled) setError('No fue posible cargar los comentarios.')
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [focus.kind, focus.id])

	async function addComment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const trimmed = body.trim()
		if (!trimmed) return
		setSaving(true)
		setError(null)
		const response = await fetch('/api/crm/activity-comments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind: focus.kind, id: focus.id, body: trimmed }),
		})
		setSaving(false)
		if (!response.ok) {
			setError('No fue posible agregar el comentario.')
			return
		}
		setBody('')
		setComments((current) => [{ id: Date.now(), body: trimmed, createdAt: new Date().toISOString(), authorName: 'Tú' }, ...current])
		onChanged()
	}

	async function complete() {
		setSaving(true)
		setError(null)
		try {
			await completeActivity(focus)
			onChanged()
			onClose()
		} catch {
			setError(focus.kind === 'task' ? 'No fue posible completar la tarea.' : 'No fue posible completar el caso.')
			setSaving(false)
		}
	}

	const kindLabel = focus.kind === 'task' ? 'Tarea' : 'Caso'

	return (
		<section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-label={`Comentarios de ${title}`}>
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kindLabel}</p>
					<h3 className="text-sm font-semibold">{title}</h3>
				</div>
				<Button type="button" size="sm" variant="ghost" onClick={onClose}>
					Cerrar
				</Button>
			</div>
			{loading && <p role="status" className="text-sm text-muted-foreground">Cargando comentarios…</p>}
			{!loading && comments.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios</p>}
			{comments.length > 0 && (
				<ul className="space-y-2">
					{comments.map((comment) => (
						<li key={comment.id} className="rounded-md border border-border px-3 py-2 text-sm">
							<p>{comment.body}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{comment.authorName} · {formatDateTimeBogota(comment.createdAt)}
							</p>
						</li>
					))}
				</ul>
			)}
			<form onSubmit={(event) => void addComment(event)} className="space-y-2">
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
				<div className="flex flex-wrap gap-2">
					<Button type="submit" size="sm" disabled={saving || !body.trim()}>
						{saving ? 'Guardando…' : 'Agregar comentario'}
					</Button>
					{canComplete && (
						<Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void complete()}>
							{focus.kind === 'task' ? 'Completar tarea' : 'Completar caso'}
						</Button>
					)}
				</div>
			</form>
			{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
		</section>
	)
}
